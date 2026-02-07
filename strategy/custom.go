package strategy

import (
	"context"
	"deriv_trade/database"
	"fmt"
	"log"
	"time"

	"github.com/dop251/goja"
	"github.com/ksysoev/deriv-api"
	"github.com/ksysoev/deriv-api/schema"
)

type CustomStrategy struct {
	api    *deriv.DerivAPI
	config Config
	vm     *goja.Runtime
}

func NewCustomStrategy(api *deriv.DerivAPI, config Config) *CustomStrategy {
	return &CustomStrategy{
		api:    api,
		config: config,
		vm:     goja.New(),
	}
}

func (s *CustomStrategy) Execute(ctx context.Context) error {
	log.Printf("Starting Custom Strategy for %s...", s.config.Symbol)

	// 1. Authorize
	if err := s.authorize(); err != nil {
		return fmt.Errorf("authorization failed: %w", err)
	}

	// 2. Setup JS Environment
	if err := s.setupEnvironment(ctx); err != nil {
		return fmt.Errorf("failed to setup JS environment: %w", err)
	}

	// 3. Run the User Script
	_, err := s.vm.RunString(s.config.Script)
	if err != nil {
		return fmt.Errorf("JS execution error: %w", err)
	}

	// Check if onTick is defined
	var onTick func(float64)
	if err := s.vm.ExportTo(s.vm.Get("onTick"), &onTick); err != nil {
		log.Printf("Warning: onTick function not found or invalid signature. Strategy might not react to ticks.")
	}

	// 4. Subscribe to Ticks
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
			// Call onTick
			if onTick != nil {
				// Execute safely
				func() {
					defer func() {
						if r := recover(); r != nil {
							log.Printf("JS Runtime panic: %v", r)
						}
					}()
					onTick(quote)
				}()
			}
		}
	}
}

func (s *CustomStrategy) authorize() error {
	reqAuth := schema.Authorize{Authorize: s.config.ApiToken}
	_, err := s.api.Authorize(reqAuth)
	return err
}

func (s *CustomStrategy) setupEnvironment(ctx context.Context) error {
	// Console Log
	s.vm.Set("log", func(msg interface{}) {
		log.Printf("[JS] %v", msg)
	})

	// Buy Function
	s.vm.Set("buy", func(contractType string, amount float64) {
		go s.placeTrade(ctx, contractType, amount)
	})

	// Helpers
	s.vm.Set("getInitialStake", func() float64 { return s.config.InitialStake })
	s.vm.Set("getSymbol", func() string { return s.config.Symbol })

	return nil
}

func (s *CustomStrategy) placeTrade(ctx context.Context, contractTypeStr string, stake float64) {
	// Limit stake check?
	if stake <= 0 {
		log.Printf("Invalid stake: %.2f", stake)
		return
	}

	// Map string to Contract type
	var contractType schema.ProposalContractType
	switch contractTypeStr {
	case "CALL":
		contractType = schema.ProposalContractTypeCALL
	case "PUT":
		contractType = schema.ProposalContractTypePUT
	case "DIGITODD":
		contractType = schema.ProposalContractTypeDIGITODD
	case "DIGITEVEN":
		contractType = schema.ProposalContractTypeDIGITEVEN
	default:
		log.Printf("Unknown contract type in script: %s", contractTypeStr)
		return
	}

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
		DurationUnit: schema.ProposalDurationUnitT,
		Symbol:       s.config.Symbol,
	}

	propResp, err := s.api.Proposal(reqProp)
	if err != nil {
		log.Printf("Proposal error: %v", err)
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

	log.Printf("Trade placed [Custom]. Stake: %.2f. Type: %s", amount, contractTypeStr)

	for contract := range buySub.Stream {
		if *contract.ProposalOpenContract.IsSold == 1 {
			profit := *contract.ProposalOpenContract.Profit
			statusRaw := contract.ProposalOpenContract.Status.Value
			status := fmt.Sprintf("%v", statusRaw)

			log.Printf("Trade Result: %s | Profit: %.2f", status, profit)
			s.saveTrade(ctx, contractTypeStr, stake, profit, status)
			return
		}
	}
}

func (s *CustomStrategy) saveTrade(ctx context.Context, contractType string, stake, profit float64, status string) {
	if s.config.DB != nil {
		trade := &database.Trade{
			Strategy:     "custom",
			Symbol:       s.config.Symbol,
			ContractType: contractType,
			Stake:        stake,
			Profit:       profit,
			Status:       status,
			// Balance:      s.balance, // Need to track balance if we want this
			TotalPnL:  profit, // approximate, or needs tracking
			Duration:  s.config.Duration,
			Timestamp: time.Now(),
		}
		if err := s.config.DB.InsertTrade(ctx, trade); err != nil {
			log.Printf("Failed to save trade: %v", err)
		}
	}
}
