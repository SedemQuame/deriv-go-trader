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

type HigherLowerStrategy struct {
	api    *deriv.DerivAPI
	config Config

	mu           sync.Mutex
	currentStake float64
	totalProfit  float64
	maxPnL       float64
	balance      float64
}

func NewHigherLowerStrategy(api *deriv.DerivAPI, config Config) *HigherLowerStrategy {
	return &HigherLowerStrategy{
		api:          api,
		config:       config,
		currentStake: config.InitialStake,
		maxPnL:       0,
	}
}

func (s *HigherLowerStrategy) Execute(ctx context.Context) error {
	log.Printf("Starting Higher/Lower Strategy for %s...", s.config.Symbol)

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

	// Keep track of quotes for basic trend
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

			if len(quotes) < s.config.StreakThreshold+1 {
				continue
			}

			// Trend Logic
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

			// Higher/Lower Strategy:
			// If trend UP -> Buy CALL with Barrier +X (Higher)
			// IF trend DOWN -> Buy PUT with Barrier -X (Lower)
			// Barrier logic: The user provided a signed barrier string, e.g. "+0.5" or "-0.5".
			// If we are strictly following Higher/Lower contracts, "Higher" is usually CALL with barrier.
			// But careful: If barrier is positive (+0.5), and we buy CALL, we win if Price > Spot+0.5.
			// If barrier is provided as "+0.5", let's use it as is for CALL.
			// For PUT, usually we want "-0.5".

			// If the user specified a generic barrier like "0.5", we might need to flip signs.
			// Let's assume user gives "+0.5" or "-0.5" explicitly via flag and we use THAT barrier constant?
			// NO, the user usually wants dynamic direction.
			// So if Trend Up -> Barrier = +0.5. If Trend Down -> Barrier = -0.5.
			// I'll parse the magnitude of the barrier.

			// Simple approach: Just use passed barrier. If user passed "+0.5", they want Higher.
			// But we are detecting trend.
			// If Trend is UP, we want to bet Higher. So we need a valid barrier for that (usually +X or -X depending on risk).
			// Let's assume user passes the Magnitude, e.g. "0.5". We apply sign.

			// Wait, the flag is a string.
			// Let's try to interpret common sense:
			// "Higher" trade usually implies you think price > spot + barrier.
			// "Lower" trade usually implies you think price < spot - barrier.

			// If trend UP -> Place CALL (Higher) with Barrier = "+0.5" (example)
			// If trend DOWN -> Place PUT (Lower) with Barrier = "-0.5" (example)

			// If the user specified "+0.5", I will just use that string.
			// If they specified "-0.5", I will use that.
			// BUT, that would mean we only trade one direction?
			// User request: "similar strategies for other contract trading types... Higher/Lower".
			// Higher/Lower allows you to pick direction.

			// Let's just follow Rise/Fall logic but add the barrier parameter.
			// If UP -> CALL + barrier. If DOWN -> PUT - barrier.
			// This requires parsing the barrier string to get absolute value.

			barrierVal := s.config.Barrier
			// Naive sign flipping if it's a number
			if len(barrierVal) > 0 {
				if barrierVal[0] == '+' || barrierVal[0] == '-' {
					barrierVal = barrierVal[1:]
				}
			}

			if isUp {
				log.Printf("Up Trend. Buying Higher (Barrier +%s)...", barrierVal)
				stake := s.getStake()
				barrier := "+" + barrierVal
				go s.placeTrade(ctx, schema.ProposalContractTypeCALL, stake, barrier)
				quotes = nil
			} else if isDown {
				log.Printf("Down Trend. Buying Lower (Barrier -%s)...", barrierVal)
				stake := s.getStake()
				barrier := "-" + barrierVal
				go s.placeTrade(ctx, schema.ProposalContractTypePUT, stake, barrier)
				quotes = nil
			}
		}
	}
}

func (s *HigherLowerStrategy) authorize() error {
	reqAuth := schema.Authorize{Authorize: s.config.ApiToken}
	_, err := s.api.Authorize(reqAuth)
	return err
}

func (s *HigherLowerStrategy) monitorBalance(ctx context.Context) {
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

func (s *HigherLowerStrategy) getStake() float64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.currentStake
}

func (s *HigherLowerStrategy) placeTrade(ctx context.Context, contractType schema.ProposalContractType, stake float64, barrier string) {
	amount := stake
	duration := s.config.Duration
	basis := schema.ProposalBasisStake
	currency := "USD"

	// Map Config Unit to Schema Unit
	var dUnit schema.ProposalDurationUnit
	switch s.config.DurationUnit {
	case "s":
		dUnit = schema.ProposalDurationUnitS
	case "m":
		dUnit = schema.ProposalDurationUnitM
	case "h":
		dUnit = schema.ProposalDurationUnitH
	case "d":
		dUnit = schema.ProposalDurationUnitD
	default:
		dUnit = schema.ProposalDurationUnitT
	}

	reqProp := schema.Proposal{
		Proposal:     1,
		Amount:       &amount,
		Basis:        &basis,
		ContractType: contractType,
		Currency:     currency,
		Duration:     &duration,
		DurationUnit: dUnit,
		Symbol:       s.config.Symbol,
		Barrier:      &barrier,
	}

	propResp, err := s.api.Proposal(reqProp)
	if err != nil {
		log.Printf("Proposal error: %v. Resetting stake.", err)
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

	log.Printf("Trade placed (%s %s). Stake: %.2f.", contractType, barrier, amount)

	for contract := range buySub.Stream {
		if *contract.ProposalOpenContract.IsSold == 1 {
			profit := *contract.ProposalOpenContract.Profit
			status := fmt.Sprintf("%v", contract.ProposalOpenContract.Status.Value)
			s.handleTradeResult(ctx, profit, status)
			return
		}
	}
}

func (s *HigherLowerStrategy) handleTradeResult(ctx context.Context, profit float64, status string) {
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
