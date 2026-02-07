package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"deriv_trade/database"
	"deriv_trade/strategy"

	"github.com/ksysoev/deriv-api"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Configuration
const (
	DerivWSEndpoint = "wss://ws.binaryws.com/websockets/v3"
	AppID           = 1089
	Language        = "en"
	Origin          = "https://localhost/"
)

func main() {
	// Parse Flags
	// Parse Flags
	stratName := flag.String("strategy", "even_odd", "Strategy to run: even_odd, rise_fall, differs, higher_lower, multiplier")
	duration := flag.Int("duration", 0, "Duration of the trade (ticks or seconds)")
	durationUnit := flag.String("unit", "t", "Duration unit: t (ticks), s (seconds), m (minutes)")
	barrier := flag.String("barrier", "", "Barrier offset (e.g., +0.5, -0.5)")
	multiplier := flag.Int("multiplier", 100, "Multiplier value (e.g., 100, 200, 500)")

	// New Flags
	symbol := flag.String("symbol", "R_10", "Symbol to trade")
	initialStake := flag.Float64("stake", 0.35, "Initial stake amount")
	targetProfit := flag.Float64("target_profit", 30.0, "Target profit")
	stopLoss := flag.Float64("stop_loss", 20.0, "Stop loss")
	martingale := flag.Float64("martingale", 1.0, "Martingale multiplier")
	streakThreshold := flag.Int("streak", 1, "Streak threshold for some strategies")
	trailingStop := flag.Bool("trailing_stop", true, "Enable trailing stop loss")

	flag.Parse()

	// Get API Token
	apiToken := os.Getenv("DERIV_API_TOKEN")
	if apiToken == "" {
		fmt.Println("Please set DERIV_API_TOKEN environment variable.")
		os.Exit(1)
	}

	// Initialize MongoDB
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = database.DefaultMongoURI
	}

	dbClient, err := database.NewClient(mongoURI)
	if err != nil {
		log.Printf("Warning: Failed to connect to MongoDB: %v. Trades will not be saved.", err)
		dbClient = nil
	}
	if dbClient != nil {
		defer func() {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			dbClient.Close(ctx)
		}()
	}

	// Create Trading Session
	var sessionID primitive.ObjectID
	if dbClient != nil {
		session := &database.TradingSession{
			Strategy:     *stratName,
			StartTime:    time.Now(),
			InitialStake: *initialStake,
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		if err := dbClient.CreateSession(ctx, session); err != nil {
			log.Printf("Warning: Failed to create session: %v", err)
		} else {
			sessionID = session.ID
			log.Printf("Created trading session: %s", sessionID.Hex())
		}
		cancel()
	}

	// Base Configuration
	config := strategy.Config{
		ApiToken:        apiToken,
		Symbol:          *symbol,
		Duration:        2,
		DurationUnit:    "t",
		InitialStake:    *initialStake,
		TargetProfit:    *targetProfit,
		StopLoss:        *stopLoss,
		StreakThreshold: *streakThreshold,
		Prediction:      -1,
		Multiplier:      100,
		DB:              dbClient,
		SessionID:       sessionID,
		StrategyName:    *stratName,
		MartingaleMulti: *martingale,
		UseTrailingStop: *trailingStop,
	}

	// Apply Flags (Overrides if explicitly set, though we used defaults in flags now)
	if *duration > 0 {
		config.Duration = *duration
	}
	if *durationUnit != "" {
		config.DurationUnit = *durationUnit
	}
	if *barrier != "" {
		config.Barrier = *barrier
	}
	if *multiplier > 0 {
		config.Multiplier = *multiplier
	}

	// Strategy Specific Tweaks
	switch *stratName {
	case "even_odd":
		// No overrides needed, uses flags
	case "rise_fall":
		if *streakThreshold == 1 { // Only override if using default, assuming 3 is better default for Rise/Fall? Or just stick to user input.
			// Let's stick to user input to be safe, or just remove overrides.
			// config.StreakThreshold = 3 // Removing this to respect flag "streak"
		}
	case "differs":
		// config.MartingaleMulti = 11.0 // Removing override
		// config.TargetProfit = 5.0 // Removing override
	case "higher_lower":
		// config.MartingaleMulti = 2.1 // Removing override
		if config.Barrier == "" {
			log.Fatal("Barrier must be specified for higher_lower strategy (e.g., -barrier +0.1)")
		}
	case "multiplier":
		// config.MartingaleMulti = 1.0 // Removing override
	case "custom":
		// No specific tweaks needed for custom strategy yet
	default:
		log.Fatalf("Unknown strategy: %s", *stratName)
	}

	// Connect to Deriv API
	api, err := deriv.NewDerivAPI(DerivWSEndpoint, AppID, Language, Origin)
	if err != nil {
		log.Fatalf("Failed to connect to Deriv API: %v", err)
	}
	defer api.Disconnect()

	// Create Strategy Instance
	var strat interface {
		Execute(context.Context) error
	}

	switch *stratName {
	case "even_odd":
		strat = strategy.NewEvenOddStrategy(api, config)
	case "rise_fall":
		strat = strategy.NewRiseFallStrategy(api, config)
	case "differs":
		strat = strategy.NewDigitDiffersStrategy(api, config)
	case "higher_lower":
		strat = strategy.NewHigherLowerStrategy(api, config)
	case "multiplier":
		strat = strategy.NewMultiplierStrategy(api, config)
	case "custom":
		// Custom strategy logic
		// We expect the script content to be passed via an environment variable "STRATEGY_SCRIPT"
		// or read from a file if a -script flag was available (but we didn't define it in main flags)
		// For now, let's rely on the environment variable as seen in controller.go
		scriptContent := os.Getenv("STRATEGY_SCRIPT")
		if scriptContent == "" {
			log.Fatal("Custom strategy selected but STRATEGY_SCRIPT environment variable is empty.")
		}
		config.Script = scriptContent
		strat = strategy.NewCustomStrategy(api, config)
	}

	// Context and Signal Handling
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("\nReceived interrupt signal. Shutting down...")
		cancel()
	}()

	// Execute Strategy
	log.Printf("Starting Trading Bot (Strategy: %s)...", *stratName)
	if err := strat.Execute(ctx); err != nil {
		if err != context.Canceled {
			log.Fatalf("Strategy execution error: %v", err)
		}
	}
	log.Println("Bot stopped.")
}
