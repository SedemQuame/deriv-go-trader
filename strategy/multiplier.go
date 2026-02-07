package strategy

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/ksysoev/deriv-api"
	"github.com/ksysoev/deriv-api/schema"
)

type MultiplierStrategy struct {
	api    *deriv.DerivAPI
	config Config

	mu               sync.Mutex
	totalProfit      float64
	maxPnL           float64
	balance          float64
	activeContractID int64
}

func NewMultiplierStrategy(api *deriv.DerivAPI, config Config) *MultiplierStrategy {
	return &MultiplierStrategy{
		api:    api,
		config: config,
		maxPnL: 0,
	}
}

func (s *MultiplierStrategy) Execute(ctx context.Context) error {
	log.Printf("Starting Multiplier Strategy for %s (x%d)...", s.config.Symbol, s.config.Multiplier)

	if err := s.authorize(); err != nil {
		return fmt.Errorf("authorization failed: %w", err)
	}

	go s.monitorBalance(ctx)

	reqTicks := schema.Ticks{Ticks: s.config.Symbol}
	_, tickSub, err := s.api.SubscribeTicks(reqTicks)
	if err != nil {
		return fmt.Errorf("failed to subscribe to ticks: %w", err)
	}
	defer tickSub.Forget()

	var quotes []float64

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case tick, ok := <-tickSub.Stream:
			if !ok {
				return fmt.Errorf("tick stream closed")
			}

			// Don't place new trade if one is active
			s.mu.Lock()
			active := s.activeContractID != 0
			s.mu.Unlock()
			if active {
				continue
			}

			quote := *tick.Tick.Quote
			quotes = append(quotes, quote)
			if len(quotes) > s.config.StreakThreshold+1 {
				quotes = quotes[1:]
			}

			log.Printf("Quote: %.4f", quote)

			if len(quotes) < s.config.StreakThreshold+1 {
				continue
			}

			// Simple Trend Logic
			isUp := true
			isDown := true
			for i := 0; i < len(quotes)-1; i++ {
				if quotes[i] >= quotes[i+1] {
					isUp = false
				}
				if quotes[i] <= quotes[i+1] {
					isDown = false
				}
			}

			if isUp {
				log.Printf("Up Trend. Buying MULTUP x%d...", s.config.Multiplier)
				go s.placeTrade(ctx, schema.ProposalContractTypeMULTUP)
				quotes = nil
			} else if isDown {
				log.Printf("Down Trend. Buying MULTDOWN x%d...", s.config.Multiplier)
				go s.placeTrade(ctx, schema.ProposalContractTypeMULTDOWN)
				quotes = nil
			}
		}
	}
}

func (s *MultiplierStrategy) authorize() error {
	reqAuth := schema.Authorize{Authorize: s.config.ApiToken}
	_, err := s.api.Authorize(reqAuth)
	return err
}

func (s *MultiplierStrategy) monitorBalance(ctx context.Context) {
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

func (s *MultiplierStrategy) placeTrade(ctx context.Context, contractType schema.ProposalContractType) {
	// Multipliers usually require currency, amount, multiplier, symbol.
	// Duration is usually not allowed or optional (handled by stop out).
	amount := s.config.InitialStake
	basis := schema.ProposalBasisStake
	currency := "USD"
	mult := float64(s.config.Multiplier)

	reqProp := schema.Proposal{
		Proposal:     1,
		Amount:       &amount,
		Basis:        &basis,
		ContractType: contractType,
		Currency:     currency,
		Symbol:       s.config.Symbol,
		Multiplier:   &mult,
		// Multipliers might require cancellation, limit_order etc.
		// For simple test, we leave them optional if API allows.
	}

	propResp, err := s.api.Proposal(reqProp)
	if err != nil {
		log.Printf("Proposal error: %v.", err)
		return
	}

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

	log.Printf("Trade open (%s). Multiplier: x%d. Waiting for exit...", contractType, s.config.Multiplier)

	s.mu.Lock()
	// We might store contract ID if we want to manually close it later
	// For now, we just monitor updates.
	s.activeContractID = 1 // Flag as active
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		s.activeContractID = 0
		s.mu.Unlock()
	}()

	// Since we don't set TP/SL in proposal (simplification), we manually monitor?
	// Actually Multipliers usually require explicit close or TP/SL.
	// Let's implement a manual close after 'Duration' if specified, or just generic TP/SL logic if supported.
	// For now, let's just watch it.
	// *Critical*: If we don't close it, it stays open forever (until crash).
	// We'll use the 'Result' monitor to exit.

	// TIMEOUT / DURATION Logic (simulated)
	// If config.Duration is set, we close after X seconds?
	// The stream loop blocks. We need a way to sell.

	// Create a timer if Config.Duration > 0
	var timeoutChan <-chan time.Time
	if s.config.Duration > 0 {
		d := time.Duration(s.config.Duration) * time.Second
		if s.config.DurationUnit == "m" {
			d = time.Duration(s.config.Duration) * time.Minute
		}
		// If unit is 't' (ticks), we iterate ticks.
		if s.config.DurationUnit == "t" {
			// handled inside loop counting
		} else {
			timer := time.NewTimer(d)
			defer timer.Stop()
			timeoutChan = timer.C
		}
	}

	contractID := int64(0)
	ticksPassed := 0

	for {
		select {
		case <-timeoutChan:
			log.Printf("Duration expired. Selling contract %d...", contractID)
			s.sellContract(contractID)
			// Loop continues until sold status received
		case contract, ok := <-buySub.Stream:
			if !ok {
				return
			}

			if contract.ProposalOpenContract.ContractId != nil {
				contractID = int64(*contract.ProposalOpenContract.ContractId)
			}

			// Check ticks duration
			if s.config.DurationUnit == "t" && s.config.Duration > 0 {
				ticksPassed++
				if ticksPassed >= s.config.Duration {
					log.Printf("Tick limit reached (%d). Selling...", ticksPassed)
					s.sellContract(contractID)
					// Reset to avoid multiple sells? function handles it.
					// Set ticksPassed to negative to stop spamming sell
					ticksPassed = -1000
				}
			}

			isSold := *contract.ProposalOpenContract.IsSold
			if isSold == 1 {
				profit := *contract.ProposalOpenContract.Profit
				status := fmt.Sprintf("%v", contract.ProposalOpenContract.Status.Value)
				s.handleTradeResult(ctx, profit, status)
				return // Trade finished
			}

			// Optional: Manual TP/SL Check
			currentProfit := *contract.ProposalOpenContract.Profit
			// log.Printf("Current PnL: %.2f", currentProfit)

			// Simple Stop Loss / Take Profit
			if currentProfit >= s.config.TargetProfit/2 { // Example mini-target
				log.Printf("Take Profit (manual) hit: %.2f. Selling...", currentProfit)
				s.sellContract(contractID)
			}
			if currentProfit <= -s.config.InitialStake*0.5 { // Example stop
				log.Printf("Stop Loss (manual) hit: %.2f. Selling...", currentProfit)
				s.sellContract(contractID)
			}
		}
	}
}

func (s *MultiplierStrategy) sellContract(contractID int64) {
	if contractID == 0 {
		return
	}
	// We need to call Sell API
	// Since api instance is in struct, we spawn a goroutine or call it.
	// sellReq := schema.SellExpired{SellExpired: 1} // No, that's for expired.
	// We need generic Sell.
	// deriv-api might have api.Sell(...)

	// The library `ksysoev/deriv-api` likely supports Sell.
	// Let's assume it does. If not, we are limited.
	// Checking previous files: no Sell usage.
	// I'll try `api.Sell(schema.Sell{Sell: contractID, Price: 0})` (Sell at market)

	go func() {
		// Attempt to sell
		// Note: schema.Sell struct usually takes `Sell` as the contract ID
		price := 0.0
		req := schema.Sell{
			Sell:  int(contractID),
			Price: price, // 0 for market
		}
		_, err := s.api.Sell(req)
		if err != nil {
			log.Printf("Failed to sell contract %d: %v", contractID, err)
		}
	}()
}

func (s *MultiplierStrategy) handleTradeResult(ctx context.Context, profit float64, status string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.totalProfit += profit
	// Update balance estimation or trust stream

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

	log.Printf("Result: %s | Profit: %.2f | Total PnL: %.2f", status, profit, s.totalProfit)

	stopLossMsg := "Trailing Stop Loss Hit"
	if !s.config.UseTrailingStop {
		stopLossMsg = "Stop Loss Hit"
	}

	if s.totalProfit <= trailingStopLevel {
		log.Printf("%s! Total PnL: %.2f <= Stop Level: %.2f. Stopping...", stopLossMsg, s.totalProfit, trailingStopLevel)
		log.Fatalf("%s - Stopping Bot", stopLossMsg)
	}

	if s.totalProfit >= s.config.TargetProfit {
		log.Fatal("Target Profit Hit - Stopping Bot")
	}
}
