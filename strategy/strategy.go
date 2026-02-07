package strategy

import (
	"context"
	"deriv_trade/database"
	"fmt"
	"log"
	"math"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/ksysoev/deriv-api"
	"github.com/ksysoev/deriv-api/schema"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Config struct {
	ApiToken        string
	Symbol          string
	Duration        int
	InitialStake    float64
	MartingaleMulti float64
	StreakThreshold int // "n" repetitions
	TargetProfit    float64
	StopLoss        float64
	Barrier         string // For Touch/No Touch, In/Out, Higher/Lower
	Prediction      int    // For Digits (Matches/Differs)
	Multiplier      int    // For Multipliers
	DurationUnit    string // "t", "s", "m", "h", "d"
	DB              *database.Client
	SessionID       primitive.ObjectID
	StrategyName    string
	UseTrailingStop bool
	Script          string // Custom JavaScript strategy
}

type EvenOddStrategy struct {
	api    *deriv.DerivAPI
	config Config

	mu           sync.Mutex
	currentStake float64
	totalProfit  float64
	maxPnL       float64
	balance      float64
}

func NewEvenOddStrategy(api *deriv.DerivAPI, config Config) *EvenOddStrategy {
	return &EvenOddStrategy{
		api:          api,
		config:       config,
		currentStake: config.InitialStake,
		maxPnL:       0, // Start at 0
	}
}

func (s *EvenOddStrategy) Execute(ctx context.Context) error {
	log.Printf("Starting strategy for %s. Waiting for %d consecutive digits...", s.config.Symbol, s.config.StreakThreshold)

	// 1. Authorize
	if err := s.authorize(); err != nil {
		return fmt.Errorf("authorization failed: %w", err)
	}

	// 2. Monitor Balance
	go s.monitorBalance(ctx)

	// 3. Subscribe to Ticks
	reqTicks := schema.Ticks{Ticks: s.config.Symbol}
	_, tickSub, err := s.api.SubscribeTicks(reqTicks)
	if err != nil {
		return fmt.Errorf("failed to subscribe to ticks: %w", err)
	}
	defer tickSub.Forget()

	evenStreak := 0
	oddStreak := 0

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case tick, ok := <-tickSub.Stream:
			if !ok {
				return fmt.Errorf("tick stream closed")
			}

			quote := *tick.Tick.Quote
			lastDigit := getLastDigit(quote)
			isEven := lastDigit%2 == 0

			// Update streaks
			if isEven {
				evenStreak++
				oddStreak = 0
			} else {
				oddStreak++
				evenStreak = 0
			}

			log.Printf("Quote: %.4f | Digit: %d | Even Streak: %d | Odd Streak: %d", quote, lastDigit, evenStreak, oddStreak)

			// Check for trade condition
			if evenStreak >= s.config.StreakThreshold {
				// Streak of Evens -> Bet Odd
				log.Printf("Streak of %d Evens detected. Placing ODD trade...", evenStreak)
				stake := s.getStake()
				go s.placeTrade(ctx, schema.ProposalContractTypeDIGITODD, stake)

				// Reset streaks after trade to avoid immediate re-entry
				evenStreak = 0
				oddStreak = 0
			} else if oddStreak >= s.config.StreakThreshold {
				// Streak of Odds -> Bet Even
				log.Printf("Streak of %d Odds detected. Placing EVEN trade...", oddStreak)
				stake := s.getStake()
				go s.placeTrade(ctx, schema.ProposalContractTypeDIGITEVEN, stake)

				// Reset streaks
				evenStreak = 0
				oddStreak = 0
			}
		}
	}
}

func (s *EvenOddStrategy) authorize() error {
	reqAuth := schema.Authorize{Authorize: s.config.ApiToken}
	_, err := s.api.Authorize(reqAuth)
	return err
}

func (s *EvenOddStrategy) monitorBalance(ctx context.Context) {
	sub := schema.BalanceSubscribe(1)
	req := schema.Balance{Subscribe: &sub}
	_, balanceSub, err := s.api.SubscribeBalance(req)
	if err != nil {
		log.Printf("Failed to subscribe to balance: %v", err)
		return
	}
	defer balanceSub.Forget()

	for {
		select {
		case <-ctx.Done():
			return
		case b, ok := <-balanceSub.Stream:
			if !ok {
				return
			}
			s.mu.Lock()
			s.balance = b.Balance.Balance
			s.mu.Unlock()
		}
	}
}

func (s *EvenOddStrategy) getStake() float64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.currentStake
}

func (s *EvenOddStrategy) placeTrade(ctx context.Context, contractType schema.ProposalContractType, stake float64) {
	// Prepare Proposal
	amount := stake
	duration := s.config.Duration
	basis := schema.ProposalBasisStake
	currency := "USD"

	reqProp := schema.Proposal{
		Proposal:     1,
		Amount:       &amount,
		Basis:        &basis,
		ContractType: contractType,
		Currency:     currency,
		Duration:     &duration,
		DurationUnit: schema.ProposalDurationUnitT, // Ticks
		Symbol:       s.config.Symbol,
	}

	// Get Proposal
	propResp, err := s.api.Proposal(reqProp)
	if err != nil {
		log.Printf("Proposal error: %v. Resetting stake to initial.", err)
		s.mu.Lock()
		s.currentStake = s.config.InitialStake
		s.mu.Unlock()
		return
	}

	// Buy
	buyReq := schema.Buy{
		Buy:   propResp.Proposal.Id,
		Price: amount,
	}

	_, buySub, err := s.api.SubscribeBuy(buyReq)
	if err != nil {
		log.Printf("Buy error: %v", err)
		return
	}
	defer buySub.Forget()

	// Monitor Trade
	log.Printf("Trade placed. Stake: %.2f. Waiting for result...", amount)

	for contract := range buySub.Stream {
		if *contract.ProposalOpenContract.IsSold == 1 {
			profit := *contract.ProposalOpenContract.Profit
			statusRaw := contract.ProposalOpenContract.Status.Value
			status, ok := statusRaw.(string)
			if !ok {
				status = fmt.Sprintf("%v", statusRaw)
			}

			s.handleTradeResult(ctx, profit, status)
			return
		}
	}
}

func (s *EvenOddStrategy) handleTradeResult(ctx context.Context, profit float64, status string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.totalProfit += profit

	// Update Max PnL for Trailing Stop
	if s.totalProfit > s.maxPnL {
		s.maxPnL = s.totalProfit
	}

	// Calculate Trailing Stop Level
	var trailingStopLevel float64
	if s.config.UseTrailingStop {
		trailingStopLevel = s.maxPnL - s.config.StopLoss
	} else {
		trailingStopLevel = -s.config.StopLoss
	}

	log.Printf("Result: %s | Profit: %.2f | Total PnL: %.2f | Balance: %.2f", strings.ToUpper(status), profit, s.totalProfit, s.balance)

	// Save trade to database
	if s.config.DB != nil {
		trade := &database.Trade{
			Strategy:     s.config.StrategyName,
			Symbol:       s.config.Symbol,
			ContractType: "EVEN/ODD",
			Stake:        s.currentStake,
			Profit:       profit,
			Status:       status,
			Balance:      s.balance,
			TotalPnL:     s.totalProfit,
			Duration:     s.config.Duration,
			DurationUnit: s.config.DurationUnit,
			Timestamp:    time.Now(),
		}

		if err := s.config.DB.InsertTrade(ctx, trade); err != nil {
			log.Printf("Failed to save trade to database: %v", err)
		}
	}

	// Check Stop Loss
	stopLossMsg := "Trailing Stop Loss Hit"
	if !s.config.UseTrailingStop {
		stopLossMsg = "Stop Loss Hit"
	}

	if s.totalProfit <= trailingStopLevel {
		log.Printf("%s! Total PnL: %.2f <= Stop Level: %.2f. Stopping...", stopLossMsg, s.totalProfit, trailingStopLevel)
		// We can't easily cancel the main loop from here without a cancel function or channel.
		// Since we passed ctx, we can't cancel it (it's a receive-only context usually, or we don't have the cancel func).
		// But we can just exit the program or signal main.
		// For now, let's just log FATAL to stop the process, or we could use a channel if we refactored.
		// Given the structure, os.Exit or panic is a crude but effective way to stop everything immediately as requested.
		// Better: return error from Execute? But we are in a goroutine.
		// Let's just log Fatal for now to ensure it stops.
		log.Fatalf("%s - Stopping Bot", stopLossMsg)
	}

	// Check Target Profit
	if s.totalProfit >= s.config.TargetProfit {
		log.Printf("Target Profit Hit! Total PnL: %.2f. Stopping...", s.totalProfit)
		log.Fatal("Target Profit Hit - Stopping Bot")
	}

	if profit > 0 {
		// Win: Reset stake
		s.currentStake = s.config.InitialStake
	} else {
		// Loss: Martingale
		newStake := s.currentStake * s.config.MartingaleMulti
		newStake = math.Round(newStake*100) / 100

		// Check if new stake exceeds remaining risk buffer
		// Buffer = (Total Profit so far) - (Stop Loss Level relative to Max PnL)
		// Stop Loss Level = Max PnL - Config.StopLoss
		// Effectively: Buffer = TotalProfit - (MaxPnL - StopLoss)
		// Usually (MaxPnL - StopLoss) is negative or small.
		// If StopLoss is a positive budget (e.g. 50), then we stop if TotalProfit <= MaxPnL - 50.
		// Allowed Loss for next trade = TotalProfit - (MaxPnL - 50).
		allowedLoss := s.totalProfit - trailingStopLevel

		if newStake > allowedLoss {
			log.Printf("Martingale stake (%.2f) exceeds allowed risk buffer (%.2f). Reverting to Initial Stake.", newStake, allowedLoss)
			s.currentStake = s.config.InitialStake
		} else {
			s.currentStake = newStake
		}
	}

	log.Printf("Next Stake: %.2f | Trailing Stop Level: %.2f", s.currentStake, trailingStopLevel)
}

func getLastDigit(val float64) int {
	// Convert to string to safely get the last character
	// Note: This assumes standard formatting. For high precision, might need better handling.
	// Deriv ticks usually have enough precision.
	// Example: 123.45 -> '5'

	// Use Sprintf to control precision if needed, but %v is usually fine for quotes
	s := fmt.Sprintf("%v", val)

	// Just take the last digit character
	for i := len(s) - 1; i >= 0; i-- {
		if s[i] >= '0' && s[i] <= '9' {
			d, _ := strconv.Atoi(string(s[i]))
			return d
		}
	}
	return 0
}
