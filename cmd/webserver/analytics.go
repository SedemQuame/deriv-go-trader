package main

import (
	"deriv_trade/database"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

type CashFlowPoint struct {
	Timestamp time.Time `json:"timestamp"`
	Balance   float64   `json:"balance"`
}

type TradeReport struct {
	TotalTrades       int     `json:"total_trades"`
	WinRate           float64 `json:"win_rate"`
	TotalProfit       float64 `json:"total_profit"`
	ProfitFactor      float64 `json:"profit_factor"`
	AvgWin            float64 `json:"avg_win"`
	AvgLoss           float64 `json:"avg_loss"`
	LargestWin        float64 `json:"largest_win"`
	LargestLoss       float64 `json:"largest_loss"`
	AvgDuration       float64 `json:"avg_duration"` // seconds
	LongestStreakWin  int     `json:"longest_streak_win"`
	LongestStreakLoss int     `json:"longest_streak_loss"`
}

func handleCashFlow(w http.ResponseWriter, r *http.Request) {
	if dbClient == nil {
		http.Error(w, "Database not connected", http.StatusServiceUnavailable)
		return
	}

	// Get all trades, sorted by time ascending
	trades, err := dbClient.GetTrades(r.Context(), bson.M{}, 1000) // Limit 1000 for chart
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Sort Ascending
	sort.Slice(trades, func(i, j int) bool {
		return trades[i].Timestamp.Before(trades[j].Timestamp)
	})

	var points []CashFlowPoint
	runningPnL := 0.0

	// Initial point
	if len(trades) > 0 {
		points = append(points, CashFlowPoint{
			Timestamp: trades[0].Timestamp.Add(-1 * time.Minute),
			Balance:   0,
		})
	}

	for _, t := range trades {
		runningPnL += t.Profit
		points = append(points, CashFlowPoint{
			Timestamp: t.Timestamp,
			Balance:   runningPnL,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(points)
}

func handleTradeReport(w http.ResponseWriter, r *http.Request) {
	if dbClient == nil {
		http.Error(w, "Database not connected", http.StatusServiceUnavailable)
		return
	}

	trades, err := dbClient.GetTrades(r.Context(), bson.M{}, 0) // Fetch all
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	report := calculateReport(trades)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(report)
}

func calculateReport(trades []database.Trade) TradeReport {
	report := TradeReport{}
	report.TotalTrades = len(trades)
	if report.TotalTrades == 0 {
		return report
	}

	wins := 0
	grossProfit := 0.0
	grossLoss := 0.0
	totalDuration := 0

	currentStreak := 0
	maxWinStreak := 0
	maxLossStreak := 0

	for _, t := range trades {
		report.TotalProfit += t.Profit
		totalDuration += t.Duration

		if t.Profit > 0 {
			wins++
			grossProfit += t.Profit
			if t.Profit > report.LargestWin {
				report.LargestWin = t.Profit
			}

			if currentStreak > 0 {
				currentStreak++
			} else {
				currentStreak = 1
			}
			if currentStreak > maxWinStreak {
				maxWinStreak = currentStreak
			}

		} else {
			absLoss := -t.Profit // Assuming loss is negative
			if t.Profit < 0 {
				grossLoss += absLoss
			}
			if t.Profit < report.LargestLoss { // Largest loss is negative number
				report.LargestLoss = t.Profit // Assuming we want the negative value
			}

			if currentStreak < 0 {
				currentStreak--
			} else {
				currentStreak = -1
			}
			if -currentStreak > maxLossStreak {
				maxLossStreak = -currentStreak
			}
		}
	}

	report.WinRate = (float64(wins) / float64(report.TotalTrades)) * 100
	if grossLoss > 0 {
		report.ProfitFactor = grossProfit / grossLoss
	} else {
		report.ProfitFactor = grossProfit // Infinite effectively
	}

	if wins > 0 {
		report.AvgWin = grossProfit / float64(wins)
	}
	lossCount := report.TotalTrades - wins
	if lossCount > 0 {
		report.AvgLoss = -grossLoss / float64(lossCount)
	}
	report.AvgDuration = float64(totalDuration) / float64(report.TotalTrades)

	report.LongestStreakWin = maxWinStreak
	report.LongestStreakLoss = maxLossStreak

	return report
}

func handleTradesExport(w http.ResponseWriter, r *http.Request) {
	if dbClient == nil {
		http.Error(w, "Database not connected", http.StatusServiceUnavailable)
		return
	}

	// Fetch all trades, sorted by timestamp desc (default) or asc
	trades, err := dbClient.GetTrades(r.Context(), bson.M{}, 0) // 0 for no limit
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Disposition", "attachment; filename=trades_export.csv")
	w.Header().Set("Content-Type", "text/csv")

	// Write CSV Header
	fmt.Fprintf(w, "Timestamp,Strategy,Symbol,Type,Stake,Profit,Status,Balance,TotalPnL,Duration\n")

	// Write Rows
	for _, t := range trades {
		fmt.Fprintf(w, "%s,%s,%s,%s,%.2f,%.2f,%s,%.2f,%.2f,%d %s\n",
			t.Timestamp.Format(time.RFC3339),
			t.Strategy,
			t.Symbol,
			t.ContractType,
			t.Stake,
			t.Profit,
			t.Status,
			t.Balance,
			t.TotalPnL,
			t.Duration,
			t.DurationUnit,
		)
	}
}
