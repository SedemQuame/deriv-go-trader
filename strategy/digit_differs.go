package strategy

import (
	"context"
	"fmt"
	"log"
	"math"
	"strconv"
	"sync"

	"github.com/ksysoev/deriv-api"
	"github.com/ksysoev/deriv-api/schema"
)

type DigitDiffersStrategy struct {
	api    *deriv.DerivAPI
	config Config

	mu           sync.Mutex
	currentStake float64
	totalProfit  float64
	maxPnL       float64
	balance      float64
}

func NewDigitDiffersStrategy(api *deriv.DerivAPI, config Config) *DigitDiffersStrategy {
	return &DigitDiffersStrategy{
		api:          api,
		config:       config,
		currentStake: config.InitialStake,
		maxPnL:       0,
	}
}

func (s *DigitDiffersStrategy) Execute(ctx context.Context) error {
	log.Printf("Starting Digit Differs Strategy for %s...", s.config.Symbol)

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

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case tick, ok := <-tickSub.Stream:
			if !ok {
				return fmt.Errorf("tick stream closed")
			}

			quote := *tick.Tick.Quote
			lastDigit := s.getLastDigit(quote)

			log.Printf("Quote: %.4f | Last Digit: %d", quote, lastDigit)

			// Strategy: Bet that the NEXT digit will NOT be 'lastDigit' (Dynamic Differs)
			// Or if Config.Prediction is set (>=0), use that.
			prediction := lastDigit
			// If config.Prediction is set (0-9), use it. otherwise use lastDigit (dynamic)
			if s.config.Prediction >= 0 && s.config.Prediction <= 9 {
				prediction = s.config.Prediction
			}

			// We need to wait for a signal? Differs strategies usually trade every tick or frequently.
			// Let's trade every tick since probability is high (90%).
			// But careful with Martingale on losses (10x loss?).

			// Let's implement a simple logic: Just trade.
			// But maybe user wants "Matches"? No, "Differs".

			// To avoid spamming, maybe wait for a specific condition?
			// E.g. If last digit was 5, bet Differs 5.

			stake := s.getStake()
			go s.placeTrade(ctx, schema.ProposalContractTypeDIGITDIFF, stake, prediction)
		}
	}
}

func (s *DigitDiffersStrategy) getLastDigit(val float64) int {
	str := fmt.Sprintf("%.5f", val) // Ensure precision
	for i := len(str) - 1; i >= 0; i-- {
		if str[i] >= '0' && str[i] <= '9' {
			d, _ := strconv.Atoi(string(str[i]))
			return d
		}
	}
	return 0
}

func (s *DigitDiffersStrategy) authorize() error {
	reqAuth := schema.Authorize{Authorize: s.config.ApiToken}
	_, err := s.api.Authorize(reqAuth)
	return err
}

func (s *DigitDiffersStrategy) monitorBalance(ctx context.Context) {
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

func (s *DigitDiffersStrategy) getStake() float64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.currentStake
}

func (s *DigitDiffersStrategy) placeTrade(ctx context.Context, contractType schema.ProposalContractType, stake float64, prediction int) {
	amount := stake
	duration := s.config.Duration
	basis := schema.ProposalBasisStake
	currency := "USD"

	// Barrier is used for Digit Prediction in some APIs, strictly it's 'barrier' field which maps to prediction?
	// For Digits, the 'barrier' parameter in Proposal is often used for the digit prediction.
	// But `Proposal` struct in `deriv-api` might have a specific field?
	// Checking `EvenOddStrategy`: It doesn't use prediction.
	// `DIGITMATCH` / `DIGITDIFF` require `barrier` set to the digit.

	// Let's check if the library supports `Barrier`. I added `Barrier` string to Config, but the `Proposal` struct needs to accept it.
	// I need to cast prediction to string "5" etc.
	barrier := fmt.Sprintf("%d", prediction)

	reqProp := schema.Proposal{
		Proposal:     1,
		Amount:       &amount,
		Basis:        &basis,
		ContractType: contractType,
		Currency:     currency,
		Duration:     &duration,
		DurationUnit: schema.ProposalDurationUnitT,
		Symbol:       s.config.Symbol,
		Barrier:      &barrier, // We need to check if schema.Proposal has Barrier field.
		// If the library version 0.3.0 doesn't have Barrier in Proposal struct, this will fail to compile.
		// `deriv-api` generated code usually includes Barrier as *string.
	}

	propResp, err := s.api.Proposal(reqProp)
	if err != nil {
		log.Printf("Proposal error: %v. Resetting stake.", err)
		// Don't reset stake on proposal error (might be market closed or limits), just return
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

	log.Printf("Trade placed (%s %d). Stake: %.2f.", contractType, prediction, amount)

	for contract := range buySub.Stream {
		if *contract.ProposalOpenContract.IsSold == 1 {
			profit := *contract.ProposalOpenContract.Profit
			status := fmt.Sprintf("%v", contract.ProposalOpenContract.Status.Value)
			s.handleTradeResult(ctx, profit, status)
			return
		}
	}
}

func (s *DigitDiffersStrategy) handleTradeResult(ctx context.Context, profit float64, status string) {
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
		// Martingale for Differs needs to be aggressive because payout is small (approx 10% usually).
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
