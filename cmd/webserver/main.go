package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"strconv"
	"sync"
	"syscall"
	"time"

	"deriv_trade/database"

	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson"
)

// Configuration
const (
	Port = ":8080"
)

func getPort() string {
	if p := os.Getenv("PORT"); p != "" {
		return ":" + p
	}
	return Port
}

var (
	dbClient *database.Client
	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins for now
		},
	}
	clients   = make(map[*websocket.Conn]bool)
	clientsMu sync.Mutex

	// System Config
	sysConfig   SystemConfig
	sysConfigMu sync.RWMutex
	ConfigFile  = "config.json"
)

type SystemConfig struct {
	DerivAPIToken string `json:"deriv_api_token"`
	MongoURI      string `json:"mongo_uri"`
	OpenAIKey     string `json:"openai_key,omitempty"`
	OpenAIModel   string `json:"openai_model,omitempty"`
}

func loadSystemConfig() {
	file, err := os.ReadFile(ConfigFile)
	if err == nil {
		json.Unmarshal(file, &sysConfig)
	}

	// Fallback to Env if missing in file
	if sysConfig.DerivAPIToken == "" {
		sysConfig.DerivAPIToken = os.Getenv("DERIV_API_TOKEN")
	}
	if sysConfig.MongoURI == "" {
		sysConfig.MongoURI = os.Getenv("MONGO_URI")
		if sysConfig.MongoURI == "" {
			sysConfig.MongoURI = database.DefaultMongoURI
		}
	}
}

func saveSystemConfig() error {
	sysConfigMu.RLock()
	defer sysConfigMu.RUnlock()

	data, err := json.MarshalIndent(sysConfig, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(ConfigFile, data, 0644)
}

func main() {
	// Load Configuration
	loadSystemConfig()

	// Initialize MongoDB
	mongoURI := sysConfig.MongoURI

	var err error
	dbClient, err = database.NewClient(mongoURI)
	if err != nil {
		log.Printf("Warning: Failed to connect to MongoDB: %v. Some features will be unavailable.", err)
		// Do not fatal exit. Setup might be needed.
	} else {
		defer func() {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			dbClient.Close(ctx)
		}()
	}

	// Serve Static Files
	fs := http.FileServer(http.Dir("./web"))
	http.Handle("/", fs)

	// API Endpoints
	http.HandleFunc("/api/stats", handleStats)
	http.HandleFunc("/api/trades", handleTrades)
	http.HandleFunc("/api/sessions", handleSessions)
	http.HandleFunc("/ws", handleWebSocket)
	http.HandleFunc("/api/settings", handleSettings)

	// Bot Control Endpoints (Placeholder for now)
	http.HandleFunc("/api/bot/start", handleBotStart)
	http.HandleFunc("/api/bot/stop", handleBotStop)
	http.HandleFunc("/api/bot/status", handleBotStatus)

	// Strategy Management
	http.HandleFunc("/api/strategies/list", handleStrategiesList)
	http.HandleFunc("/api/strategies/get", handleStrategyGet)
	http.HandleFunc("/api/strategies/save", handleStrategySave)
	http.HandleFunc("/api/strategies/delete", handleStrategyDelete)

	// Journal & Logs
	http.HandleFunc("/api/journal/list", handleJournalList)
	http.HandleFunc("/api/journal/create", handleJournalCreate)
	http.HandleFunc("/api/journal/delete", handleJournalDelete)
	http.HandleFunc("/api/logs/download", handleLogsDownload)

	// Analytics & AI
	http.HandleFunc("/api/analytics/cashflow", handleCashFlow)
	http.HandleFunc("/api/analytics/report", handleTradeReport)
	http.HandleFunc("/api/analytics/analyze", handleAIAnalyze)
	http.HandleFunc("/api/analytics/generate-strategy", handleAIGenerateStrategy)
	http.HandleFunc("/api/trades/export", handleTradesExport)

	// Server
	port := getPort()
	server := &http.Server{
		Addr:    port,
		Handler: nil,
	}

	// Graceful Shutdown
	go func() {
		log.Printf("Starting web server on %s...", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("ListenAndServe: %v", err)
		}
	}()

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	log.Println("\nReceived interrupt signal. Shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server Shutdown Failed: %v", err)
	}
	log.Println("Server exited properly")
}

// API Handlers
func handleStats(w http.ResponseWriter, r *http.Request) {
	if dbClient == nil {
		http.Error(w, "Database not connected", http.StatusServiceUnavailable)
		return
	}
	strategy := r.URL.Query().Get("strategy")
	filter := bson.M{}
	if strategy != "" {
		filter["strategy"] = strategy
	}

	stats, err := dbClient.GetTradeStats(r.Context(), filter)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func handleTrades(w http.ResponseWriter, r *http.Request) {
	if dbClient == nil {
		http.Error(w, "Database not connected", http.StatusServiceUnavailable)
		return
	}
	limitStr := r.URL.Query().Get("limit")
	limit := int64(50)
	if limitStr != "" {
		if val, err := strconv.ParseInt(limitStr, 10, 64); err == nil {
			limit = val
		}
	}

	strategy := r.URL.Query().Get("strategy")
	var trades []database.Trade
	var err error

	if strategy != "" {
		trades, err = dbClient.GetTradesByStrategy(r.Context(), strategy, limit)
	} else {
		trades, err = dbClient.GetTrades(r.Context(), bson.M{}, limit)
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(trades)
}

func handleSessions(w http.ResponseWriter, r *http.Request) {
	if dbClient == nil {
		http.Error(w, "Database not connected", http.StatusServiceUnavailable)
		return
	}
	limitStr := r.URL.Query().Get("limit")
	limit := int64(10)
	if limitStr != "" {
		if val, err := strconv.ParseInt(limitStr, 10, 64); err == nil {
			limit = val
		}
	}

	sessions, err := dbClient.GetSessions(r.Context(), limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sessions)
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer ws.Close()

	clientsMu.Lock()
	clients[ws] = true
	clientsMu.Unlock()

	log.Println("New WebSocket client connected")

	for {
		_, _, err := ws.ReadMessage()
		if err != nil {
			log.Printf("WebSocket error: %v", err)
			clientsMu.Lock()
			delete(clients, ws)
			clientsMu.Unlock()
			break
		}
	}
}

func handleBotStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var config BotConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := botManager.Start(config); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "started"})
}

func handleBotStop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := botManager.Stop(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "stopped"})
}

func handleBotStatus(w http.ResponseWriter, r *http.Request) {
	botManager.mu.Lock()
	defer botManager.mu.Unlock()

	response := map[string]interface{}{
		"running": botManager.running,
	}

	if botManager.running && !botManager.startTime.IsZero() {
		response["start_time"] = botManager.startTime.Unix()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleSettings(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		sysConfigMu.RLock()
		defer sysConfigMu.RUnlock()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(sysConfig)
	} else if r.Method == http.MethodPost {
		var newConfig SystemConfig
		if err := json.NewDecoder(r.Body).Decode(&newConfig); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		sysConfigMu.Lock()
		sysConfig = newConfig
		sysConfigMu.Unlock()

		if err := saveSystemConfig(); err != nil {
			http.Error(w, "Failed to save config", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "saved"})
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// BotManager handles the trading bot process
type BotManager struct {
	cmd       *exec.Cmd
	running   bool
	mu        sync.Mutex
	logChan   chan string
	stopChan  chan struct{}
	startTime time.Time
}

type BotConfig struct {
	Strategy        string  `json:"strategy"`
	Duration        int     `json:"duration"`
	DurationUnit    string  `json:"duration_unit"`
	Barrier         string  `json:"barrier"`
	Multiplier      int     `json:"multiplier"`
	InitialStake    float64 `json:"initial_stake"`
	TargetProfit    float64 `json:"target_profit"`
	StopLoss        float64 `json:"stop_loss"`
	StreakThreshold int     `json:"streak_threshold"`
	Martingale      float64 `json:"martingale"`
	Symbol          string  `json:"symbol"`
	UseTrailingStop bool    `json:"use_trailing_stop"`
	Script          string  `json:"script"` // Custom strategy script content
}

var botManager = &BotManager{
	logChan:  make(chan string, 100),
	stopChan: make(chan struct{}),
}

func (bm *BotManager) Start(config BotConfig) error {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	if bm.running {
		return fmt.Errorf("bot is already running")
	}

	// Build command arguments
	args := []string{
		"-strategy", config.Strategy,
		"-duration", strconv.Itoa(config.Duration),
		"-unit", config.DurationUnit,
		"-multiplier", strconv.Itoa(config.Multiplier),
		"-stake", fmt.Sprintf("%f", config.InitialStake),
		"-target_profit", fmt.Sprintf("%f", config.TargetProfit),
		"-stop_loss", fmt.Sprintf("%f", config.StopLoss),
		"-martingale", fmt.Sprintf("%f", config.Martingale),
		"-streak", strconv.Itoa(config.StreakThreshold),
		"-symbol", config.Symbol,
		"-trailing_stop=" + strconv.FormatBool(config.UseTrailingStop),
	}

	if config.Barrier != "" {
		args = append(args, "-barrier", config.Barrier)
	}

	// Note: The Go binary now accepts all these flags.

	// Determine binary name based on OS
	binaryName := "./deriv_trade"
	if os.Getenv("GOOS") == "windows" || os.PathSeparator == '\\' {
		binaryName = "deriv_trade.exe"
	}

	// If the binary is in the database directory or resource path, we might need absolute path
	// But assuming CWD is correct (set by electron main.js)
	if _, err := os.Stat(binaryName); err != nil {
		// Try without ./ prefix if Windows
		if os.PathSeparator == '\\' {
			if _, err := os.Stat("deriv_trade.exe"); err == nil {
				binaryName = "deriv_trade.exe"
			}
		}
	}

	bm.cmd = exec.Command(binaryName, args...)

	// Inject API Token from config
	bm.cmd.Env = os.Environ()
	sysConfigMu.RLock()
	token := sysConfig.DerivAPIToken
	sysConfigMu.RUnlock()
	bm.cmd.Env = append(bm.cmd.Env, "DERIV_API_TOKEN="+token)

	// Inject STRATEGY_SCRIPT if present in config (custom strategy)
	if config.Strategy == "custom" && config.Script != "" {
		bm.cmd.Env = append(bm.cmd.Env, "STRATEGY_SCRIPT="+config.Script)
	}

	// Create pipes for stdout and stderr
	stdoutPipe, err := bm.cmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderrPipe, err := bm.cmd.StderrPipe()
	if err != nil {
		return err
	}

	if err := bm.cmd.Start(); err != nil {
		return err
	}

	bm.running = true
	bm.startTime = time.Now()

	// Stream logs
	go bm.streamOutput(stdoutPipe)
	go bm.streamOutput(stderrPipe)

	// Monitor process in background
	go func() {
		bm.cmd.Wait()
		bm.mu.Lock()
		bm.running = false
		bm.startTime = time.Time{}
		bm.cmd = nil
		bm.mu.Unlock()
		broadcast("Bot stopped", "info")
	}()

	broadcast(fmt.Sprintf("Bot started with strategy: %s", config.Strategy), "info")
	return nil
}

func (bm *BotManager) Stop() error {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	if !bm.running || bm.cmd == nil {
		return fmt.Errorf("bot is not running")
	}

	if err := bm.cmd.Process.Signal(syscall.SIGTERM); err != nil {
		// Force kill if SIGTERM fails
		bm.cmd.Process.Kill()
	}

	return nil
}

func (bm *BotManager) streamOutput(r io.Reader) {
	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		text := scanner.Text()
		// Send to WebSocket
		broadcast(text, "log")
	}
}

func broadcast(message, type_ string) {
	msg := map[string]string{
		"type":    type_,
		"message": message,
		"time":    time.Now().Format("15:04:05"),
	}

	clientsMu.Lock()
	defer clientsMu.Unlock()

	for client := range clients {
		if err := client.WriteJSON(msg); err != nil {
			log.Printf("Websocket write error: %v", err)
			client.Close()
			delete(clients, client)
		}
	}
}
