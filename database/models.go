package database

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Trade represents a single trade record
type Trade struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Strategy     string             `bson:"strategy" json:"strategy"`
	Symbol       string             `bson:"symbol" json:"symbol"`
	ContractType string             `bson:"contract_type" json:"contract_type"`
	Stake        float64            `bson:"stake" json:"stake"`
	Profit       float64            `bson:"profit" json:"profit"`
	Status       string             `bson:"status" json:"status"`
	Balance      float64            `bson:"balance" json:"balance"`
	TotalPnL     float64            `bson:"total_pnl" json:"total_pnl"`
	Duration     int                `bson:"duration" json:"duration"`
	DurationUnit string             `bson:"duration_unit" json:"duration_unit"`
	Barrier      string             `bson:"barrier,omitempty" json:"barrier,omitempty"`
	Prediction   int                `bson:"prediction,omitempty" json:"prediction,omitempty"`
	Timestamp    time.Time          `bson:"timestamp" json:"timestamp"`
	ContractID   string             `bson:"contract_id,omitempty" json:"contract_id,omitempty"`
}

// TradingSession represents a trading session summary
type TradingSession struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Strategy      string             `bson:"strategy" json:"strategy"`
	StartTime     time.Time          `bson:"start_time" json:"start_time"`
	EndTime       *time.Time         `bson:"end_time,omitempty" json:"end_time,omitempty"`
	TotalTrades   int                `bson:"total_trades" json:"total_trades"`
	WinningTrades int                `bson:"winning_trades" json:"winning_trades"`
	LosingTrades  int                `bson:"losing_trades" json:"losing_trades"`
	TotalPnL      float64            `bson:"total_pnl" json:"total_pnl"`
	MaxPnL        float64            `bson:"max_pnl" json:"max_pnl"`
	InitialStake  float64            `bson:"initial_stake" json:"initial_stake"`
	FinalBalance  float64            `bson:"final_balance" json:"final_balance"`
	StopReason    string             `bson:"stop_reason,omitempty" json:"stop_reason,omitempty"`
}

// JournalEntry represents a user's journal entry regarding their trading activity
type JournalEntry struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Title     string             `bson:"title" json:"title"`
	Content   string             `bson:"content" json:"content"` // Markdown or Text
	Tags      []string           `bson:"tags" json:"tags"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}
