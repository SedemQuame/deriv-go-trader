package strategy

import (
	"context"
	"fmt"
	"log"
	"math"
	"sync"

	"github.com/ksysoev/deriv-api"
	"github.com/ksysoev/deriv-api/schema"
)

type RiseFallStrategy struct {
	api    *deriv.DerivAPI
	config Config

	mu           sync.Mutex
	currentStake float64
	totalProfit  float64
	maxPnL       float64
	balance      float64
}

func NewRiseFallStrategy(api *deriv.DerivAPI, config Config) *RiseFallStrategy {
	return &RiseFallStrategy{
		api:          api,
		config:       config,
		currentStake: config.InitialStake,
		maxPnL:       0,
	}
}

func (s *RiseFallStrategy) Execute(ctx context.Context) error {
	log.Printf("Starting Rise/Fall Strategy for %s...", s.config.Symbol)

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

	// Keep track of last few quotes to determine trend
	var quotes []float64

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case tick, ok := <-tickSub.Stream:
			if !ok {
				return fmt.Errorf("tick stream closed")
			}

			quote := *tick.Tick.Quote
			quotes = append(quotes, quote)
			if len(quotes) > s.config.StreakThreshold+1 {
				quotes = quotes[1:]
			}

			log.Printf("Quote: %.4f", quote)

			// Need at least StreakThreshold + 1 data points to comparisons
			if len(quotes) < s.config.StreakThreshold+1 {
				continue
			}

			// Check Trend
			isUp := true
			isDown := true

			// Check if strictly increasing or decreasing for the last N ticks
			// quotes[0] < quotes[1] < ... < quotes[N]
			for i := 0; i < len(quotes)-1; i++ {
				if quotes[i] >= quotes[i+1] {
					isUp = false
				}
				if quotes[i] <= quotes[i+1] {
					isDown = false
				}
			}

			if isUp {
				log.Printf("Up Trend Detected (%d ticks). Buying CALL...", s.config.StreakThreshold)
				stake := s.getStake()
				// CALL = Rise
				go s.placeTrade(ctx, schema.ProposalContractTypeCALL, stake)
				quotes = nil // Reset
			} else if isDown {
				log.Printf("Down Trend Detected (%d ticks). Buying PUT...", s.config.StreakThreshold)
				stake := s.getStake()
				// PUT = Fall
				go s.placeTrade(ctx, schema.ProposalContractTypePUT, stake)
				quotes = nil // Reset
			}
		}
	}
}

func (s *RiseFallStrategy) authorize() error {
	reqAuth := schema.Authorize{Authorize: s.config.ApiToken}
	_, err := s.api.Authorize(reqAuth)
	return err
}

func (s *RiseFallStrategy) monitorBalance(ctx context.Context) {
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

func (s *RiseFallStrategy) getStake() float64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.currentStake
}

func (s *RiseFallStrategy) placeTrade(ctx context.Context, contractType schema.ProposalContractType, stake float64) {
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
		Duration:     &duration, // Usually ticks
		DurationUnit: schema.ProposalDurationUnitT,
		Symbol:       s.config.Symbol,
	}

	propResp, err := s.api.Proposal(reqProp)
	if err != nil {
		log.Printf("Proposal error: %v. Resetting stake.", err)
		s.mu.Lock()
		s.currentStake = s.config.InitialStake
		s.mu.Unlock()
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

	log.Printf("Trade placed (%s). Stake: %.2f.", contractType, amount)

	for contract := range buySub.Stream {
		if *contract.ProposalOpenContract.IsSold == 1 {
			profit := *contract.ProposalOpenContract.Profit
			status := fmt.Sprintf("%v", contract.ProposalOpenContract.Status.Value)
			s.handleTradeResult(ctx, profit, status)
			return
		}
	}
}

func (s *RiseFallStrategy) handleTradeResult(ctx context.Context, profit float64, status string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.totalProfit += profit
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

	log.Printf("Result: %s | Profit: %.2f | Total PnL: %.2f | Balance: %.2f", status, profit, s.totalProfit, s.balance)

	stopLossMsg := "Trailing Stop Loss Hit"
	if !s.config.UseTrailingStop {
		stopLossMsg = "Stop Loss Hit"
	}

	if s.totalProfit <= trailingStopLevel {
		log.Printf("%s! Total PnL: %.2f <= Stop Level: %.2f. Stopping...", stopLossMsg, s.totalProfit, trailingStopLevel)
		log.Fatalf("%s - Stopping Bot", stopLossMsg)
	}
	if s.totalProfit >= s.config.TargetProfit {
		log.Printf("Target Profit Hit! Total PnL: %.2f. Stopping...", s.totalProfit)
		log.Fatal("Target Profit Hit - Stopping Bot")
	}

	if profit > 0 {
		s.currentStake = s.config.InitialStake
	} else {
		newStake := s.currentStake * s.config.MartingaleMulti
		newStake = math.Round(newStake*100) / 100

		allowedLoss := s.totalProfit - trailingStopLevel
		if newStake > allowedLoss {
			log.Printf("Martingale stake (%.2f) exceeds allowed risk buffer (%.2f). Reverting to Initial Stake.", newStake, allowedLoss)
			s.currentStake = s.config.InitialStake
		} else {
			s.currentStake = newStake
		}
	}
	log.Printf("Next Stake: %.2f", s.currentStake)
}
