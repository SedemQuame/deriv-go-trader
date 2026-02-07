package botcontrol

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"deriv_trade/database"
	"deriv_trade/strategy"

	"github.com/ksysoev/deriv-api"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// BotConfig represents the bot configuration
type BotConfig struct {
	Strategy        string  `json:"strategy"`
	Symbol          string  `json:"symbol"`
	Duration        int     `json:"duration"`
	DurationUnit    string  `json:"duration_unit"`
	InitialStake    float64 `json:"initial_stake"`
	TargetProfit    float64 `json:"target_profit"`
	StopLoss        float64 `json:"stop_loss"`
	StreakThreshold int     `json:"streak_threshold"`
	MartingaleMulti float64 `json:"martingale_multi"`
	Barrier         string  `json:"barrier,omitempty"`
	Prediction      int     `json:"prediction,omitempty"`
	Multiplier      int     `json:"multiplier,omitempty"`
	Script          string  `json:"script,omitempty"`
}

// BotStatus represents the current bot status
type BotStatus struct {
	Running      bool      `json:"running"`
	Strategy     string    `json:"strategy"`
	TotalPnL     float64   `json:"total_pnl"`
	TotalTrades  int       `json:"total_trades"`
	CurrentStake float64   `json:"current_stake"`
	Balance      float64   `json:"balance"`
	StartTime    time.Time `json:"start_time,omitempty"`
	SessionID    string    `json:"session_id,omitempty"`
}

// Controller manages the trading bot
type Controller struct {
	mu          sync.RWMutex
	running     bool
	config      BotConfig
	status      BotStatus
	apiToken    string
	db          *database.Client
	cancel      context.CancelFunc
	statusChan  chan BotStatus
	subscribers []chan BotStatus
}

// NewController creates a new bot controller
func NewController(apiToken string, db *database.Client) *Controller {
	return &Controller{
		apiToken:    apiToken,
		db:          db,
		statusChan:  make(chan BotStatus, 10),
		subscribers: make([]chan BotStatus, 0),
		status: BotStatus{
			Running: false,
		},
	}
}

// Subscribe to status updates
func (c *Controller) Subscribe() chan BotStatus {
	c.mu.Lock()
	defer c.mu.Unlock()

	ch := make(chan BotStatus, 10)
	c.subscribers = append(c.subscribers, ch)
	return ch
}

// Unsubscribe from status updates
func (c *Controller) Unsubscribe(ch chan BotStatus) {
	c.mu.Lock()
	defer c.mu.Unlock()

	for i, sub := range c.subscribers {
		if sub == ch {
			c.subscribers = append(c.subscribers[:i], c.subscribers[i+1:]...)
			close(ch)
			break
		}
	}
}

// broadcastStatus sends status to all subscribers
func (c *Controller) broadcastStatus(status BotStatus) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	for _, sub := range c.subscribers {
		select {
		case sub <- status:
		default:
			// Skip if channel is full
		}
	}
}

// Start starts the trading bot with the given configuration
func (c *Controller) Start(config BotConfig) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.running {
		return fmt.Errorf("bot is already running")
	}

	c.config = config
	c.running = true

	// Create context
	ctx, cancel := context.WithCancel(context.Background())
	c.cancel = cancel

	// Start bot in goroutine
	go c.runBot(ctx)

	return nil
}

// Stop stops the trading bot
func (c *Controller) Stop() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if !c.running {
		return fmt.Errorf("bot is not running")
	}

	if c.cancel != nil {
		c.cancel()
	}

	c.running = false
	c.status.Running = false
	c.broadcastStatus(c.status)

	return nil
}

// GetStatus returns the current bot status
func (c *Controller) GetStatus() BotStatus {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.status
}

// GetConfig returns the current configuration
func (c *Controller) GetConfig() BotConfig {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.config
}

// UpdateStatus updates the bot status (called by strategies)
func (c *Controller) UpdateStatus(totalPnL, currentStake, balance float64, totalTrades int) {
	c.mu.Lock()
	c.status.TotalPnL = totalPnL
	c.status.CurrentStake = currentStake
	c.status.Balance = balance
	c.status.TotalTrades = totalTrades
	status := c.status
	c.mu.Unlock()

	c.broadcastStatus(status)
}

// runBot runs the trading bot
func (c *Controller) runBot(ctx context.Context) {
	defer func() {
		c.mu.Lock()
		c.running = false
		c.status.Running = false
		c.mu.Unlock()
		c.broadcastStatus(c.status)
	}()

	// Connect to Deriv API
	api, err := deriv.NewDerivAPI(
		"wss://ws.binaryws.com/websockets/v3",
		1089,
		"en",
		"https://localhost/",
	)
	if err != nil {
		log.Printf("Failed to connect to Deriv API: %v", err)
		return
	}
	defer api.Disconnect()

	// Create session
	var sessionID primitive.ObjectID
	if c.db != nil {
		session := &database.TradingSession{
			Strategy:     c.config.Strategy,
			StartTime:    time.Now(),
			InitialStake: c.config.InitialStake,
		}
		if err := c.db.CreateSession(ctx, session); err != nil {
			log.Printf("Warning: Failed to create session: %v", err)
		} else {
			sessionID = session.ID
			c.mu.Lock()
			c.status.SessionID = sessionID.Hex()
			c.status.StartTime = time.Now()
			c.mu.Unlock()
		}
	}

	// Build strategy config
	stratConfig := strategy.Config{
		ApiToken:        c.apiToken,
		Symbol:          c.config.Symbol,
		Duration:        c.config.Duration,
		DurationUnit:    c.config.DurationUnit,
		InitialStake:    c.config.InitialStake,
		TargetProfit:    c.config.TargetProfit,
		StopLoss:        c.config.StopLoss,
		StreakThreshold: c.config.StreakThreshold,
		MartingaleMulti: c.config.MartingaleMulti,
		Barrier:         c.config.Barrier,
		Prediction:      c.config.Prediction,
		Multiplier:      c.config.Multiplier,
		DB:              c.db,
		SessionID:       sessionID,
		StrategyName:    c.config.Strategy,
	}

	// Update status
	c.mu.Lock()
	c.status.Running = true
	c.status.Strategy = c.config.Strategy
	c.status.StartTime = time.Now()
	c.mu.Unlock()
	c.broadcastStatus(c.status)

	// Create and run strategy
	var strat interface{ Execute(context.Context) error }

	switch c.config.Strategy {
	case "even_odd":
		strat = strategy.NewEvenOddStrategy(api, stratConfig)
	case "rise_fall":
		strat = strategy.NewRiseFallStrategy(api, stratConfig)
	case "differs":
		strat = strategy.NewDigitDiffersStrategy(api, stratConfig)
	case "higher_lower":
		strat = strategy.NewHigherLowerStrategy(api, stratConfig)
	case "multiplier":
		strat = strategy.NewMultiplierStrategy(api, stratConfig)
	case "custom":
		stratConfig.Script = c.config.Script
		strat = strategy.NewCustomStrategy(api, stratConfig)
	default:
		log.Printf("Unknown strategy: %s", c.config.Strategy)
		return
	}

	// Execute strategy
	if err := strat.Execute(ctx); err != nil {
		if err != context.Canceled {
			log.Printf("Strategy execution error: %v", err)
		}
	}
}
