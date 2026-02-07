package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	DatabaseName       = "deriv_trader"
	TradesCollection   = "trades"
	SessionsCollection = "sessions"
	DefaultMongoURI    = "mongodb://localhost:27017"
)

type Client struct {
	client   *mongo.Client
	db       *mongo.Database
	trades   *mongo.Collection
	sessions *mongo.Collection
	journals *mongo.Collection
}

// NewClient creates a new MongoDB client
func NewClient(mongoURI string) (*Client, error) {
	if mongoURI == "" {
		mongoURI = DefaultMongoURI
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(mongoURI)
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	// Ping the database
	if err := client.Ping(ctx, nil); err != nil {
		return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	db := client.Database(DatabaseName)

	log.Printf("Connected to MongoDB at %s", mongoURI)

	return &Client{
		client:   client,
		db:       db,
		trades:   db.Collection(TradesCollection),
		sessions: db.Collection(SessionsCollection),
		journals: db.Collection("journals"),
	}, nil
}

// Close closes the MongoDB connection
func (c *Client) Close(ctx context.Context) error {
	return c.client.Disconnect(ctx)
}

// InsertTrade inserts a new trade record
func (c *Client) InsertTrade(ctx context.Context, trade *Trade) error {
	if trade.Timestamp.IsZero() {
		trade.Timestamp = time.Now()
	}

	result, err := c.trades.InsertOne(ctx, trade)
	if err != nil {
		return fmt.Errorf("failed to insert trade: %w", err)
	}

	trade.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// GetTrades retrieves trades with optional filters
func (c *Client) GetTrades(ctx context.Context, filter bson.M, limit int64) ([]Trade, error) {
	opts := options.Find().SetSort(bson.D{{Key: "timestamp", Value: -1}})
	if limit > 0 {
		opts.SetLimit(limit)
	}

	cursor, err := c.trades.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to find trades: %w", err)
	}
	defer cursor.Close(ctx)

	var trades []Trade
	if err := cursor.All(ctx, &trades); err != nil {
		return nil, fmt.Errorf("failed to decode trades: %w", err)
	}

	return trades, nil
}

// GetTradesByStrategy retrieves trades for a specific strategy
func (c *Client) GetTradesByStrategy(ctx context.Context, strategy string, limit int64) ([]Trade, error) {
	filter := bson.M{"strategy": strategy}
	return c.GetTrades(ctx, filter, limit)
}

// GetTradeStats calculates statistics for trades
func (c *Client) GetTradeStats(ctx context.Context, filter bson.M) (map[string]interface{}, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: nil},
			{Key: "total_trades", Value: bson.D{{Key: "$sum", Value: 1}}},
			{Key: "winning_trades", Value: bson.D{{Key: "$sum", Value: bson.D{{Key: "$cond", Value: bson.A{bson.D{{Key: "$gt", Value: bson.A{"$profit", 0}}}, 1, 0}}}}}},
			{Key: "losing_trades", Value: bson.D{{Key: "$sum", Value: bson.D{{Key: "$cond", Value: bson.A{bson.D{{Key: "$lte", Value: bson.A{"$profit", 0}}}, 1, 0}}}}}},
			{Key: "total_pnl", Value: bson.D{{Key: "$sum", Value: "$profit"}}},
			{Key: "avg_profit", Value: bson.D{{Key: "$avg", Value: "$profit"}}},
			{Key: "max_profit", Value: bson.D{{Key: "$max", Value: "$profit"}}},
			{Key: "min_profit", Value: bson.D{{Key: "$min", Value: "$profit"}}},
		}}},
	}

	cursor, err := c.trades.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate trade stats: %w", err)
	}
	defer cursor.Close(ctx)

	var results []map[string]interface{}
	if err := cursor.All(ctx, &results); err != nil {
		return nil, fmt.Errorf("failed to decode stats: %w", err)
	}

	if len(results) == 0 {
		return map[string]interface{}{
			"total_trades":   0,
			"winning_trades": 0,
			"losing_trades":  0,
			"total_pnl":      0.0,
			"avg_profit":     0.0,
			"max_profit":     0.0,
			"min_profit":     0.0,
		}, nil
	}

	return results[0], nil
}

// CreateSession creates a new trading session
func (c *Client) CreateSession(ctx context.Context, session *TradingSession) error {
	if session.StartTime.IsZero() {
		session.StartTime = time.Now()
	}

	result, err := c.sessions.InsertOne(ctx, session)
	if err != nil {
		return fmt.Errorf("failed to create session: %w", err)
	}

	session.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// UpdateSession updates an existing trading session
func (c *Client) UpdateSession(ctx context.Context, sessionID primitive.ObjectID, update bson.M) error {
	filter := bson.M{"_id": sessionID}
	updateDoc := bson.M{"$set": update}

	_, err := c.sessions.UpdateOne(ctx, filter, updateDoc)
	if err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}

	return nil
}

// GetSessions retrieves trading sessions
func (c *Client) GetSessions(ctx context.Context, limit int64) ([]TradingSession, error) {
	opts := options.Find().SetSort(bson.D{{Key: "start_time", Value: -1}})
	if limit > 0 {
		opts.SetLimit(limit)
	}

	cursor, err := c.sessions.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to find sessions: %w", err)
	}
	defer cursor.Close(ctx)

	var sessions []TradingSession
	if err := cursor.All(ctx, &sessions); err != nil {
		return nil, fmt.Errorf("failed to decode sessions: %w", err)
	}

	return sessions, nil
}

// CreateJournalEntry adds a new entry
func (c *Client) CreateJournalEntry(ctx context.Context, entry *JournalEntry) error {
	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = time.Now()
	}
	entry.UpdatedAt = entry.CreatedAt

	result, err := c.journals.InsertOne(ctx, entry)
	if err != nil {
		return fmt.Errorf("failed to create journal entry: %w", err)
	}

	entry.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// GetJournalEntries retrieves entries
func (c *Client) GetJournalEntries(ctx context.Context, limit int64) ([]JournalEntry, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	if limit > 0 {
		opts.SetLimit(limit)
	}

	cursor, err := c.journals.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to find journal entries: %w", err)
	}
	defer cursor.Close(ctx)

	var entries []JournalEntry
	if err := cursor.All(ctx, &entries); err != nil {
		return nil, fmt.Errorf("failed to decode entries: %w", err)
	}

	return entries, nil
}

// DeleteJournalEntry deletes an entry by ID
func (c *Client) DeleteJournalEntry(ctx context.Context, id primitive.ObjectID) error {
	_, err := c.journals.DeleteOne(ctx, bson.M{"_id": id})
	return err
}
