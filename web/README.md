# Deriv Trading Dashboard

A beautiful, real-time web dashboard for monitoring your Deriv automated trading bot performance.

## Features

- 📊 **Real-time Statistics**: Track total PnL, trade count, win rate, and average profit
- 📈 **Interactive Charts**: 
  - **PnL Over Time**: Line chart showing cumulative profit/loss progression
  - **Win/Loss Distribution**: Doughnut chart visualizing win rate
  - **Profit Distribution**: Bar chart showing individual trade profits
- 📋 **Trade History**: View detailed history of all trades with timestamps and outcomes
- 🎯 **Session Tracking**: Monitor individual trading sessions and their performance
- 🔍 **Strategy Filtering**: Filter data by specific trading strategies
- 🎨 **Modern UI**: Beautiful dark-mode interface with smooth animations
- 🔄 **Auto-refresh**: Automatically updates every 30 seconds

## Prerequisites

- MongoDB running on `localhost:27017` (or set `MONGO_URI` environment variable)
- Trading bot running with MongoDB integration

## Quick Start

### 1. Start MongoDB

If you don't have MongoDB installed:

```bash
# macOS
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 2. Start the Web Server

```bash
cd /Users/sedemquame/Documents/Commercial/self/trading/deriv-go-trader
go run cmd/webserver/main.go
```

The server will start on `http://localhost:8080`

### 3. Start the Trading Bot

In a separate terminal:

```bash
export DERIV_API_TOKEN="your_token_here"
./deriv_trade -strategy even_odd
```

### 4. View the Dashboard

Open your browser and navigate to:
```
http://localhost:8080
```

## Environment Variables

- `MONGO_URI`: MongoDB connection string (default: `mongodb://localhost:27017`)
- `PORT`: Web server port (default: `8080`)

## API Endpoints

The web server exposes the following REST API endpoints:

### Get Trades
```
GET /api/trades?strategy=even_odd&limit=50
```

### Get Sessions
```
GET /api/sessions?limit=10
```

### Get Statistics
```
GET /api/stats?strategy=even_odd
```

## Customization

### Change Port

```bash
PORT=3000 go run cmd/webserver/main.go
```

### Use Remote MongoDB

```bash
MONGO_URI="mongodb://user:pass@remote-host:27017" go run cmd/webserver/main.go
```

## Development

The web dashboard consists of:

- `cmd/webserver/main.go` - Go API server
- `web/index.html` - Dashboard HTML
- `web/style.css` - Styling and animations
- `web/app.js` - Client-side JavaScript

To modify the UI, edit the files in the `web/` directory. Changes will be reflected immediately on page refresh.

## Troubleshooting

### Cannot connect to MongoDB

Ensure MongoDB is running:
```bash
# Check if MongoDB is running
brew services list | grep mongodb

# Or check Docker container
docker ps | grep mongo
```

### No trades showing

1. Ensure the trading bot is running with MongoDB integration
2. Check that trades are being saved to the database
3. Verify the `MONGO_URI` is correct in both the bot and web server

### Port already in use

Change the port:
```bash
PORT=8081 go run cmd/webserver/main.go
```

## Screenshots

The dashboard features:
- Live PnL tracking with color-coded positive/negative values
- **Three interactive charts powered by Chart.js**:
  - Smooth line chart showing PnL progression over time
  - Doughnut chart with win/loss percentage breakdown
  - Bar chart displaying profit distribution across trades
- Detailed trade table with filtering capabilities
- Session cards showing performance metrics
- Responsive design that works on mobile and desktop
- Smooth animations and hover effects

## License

Same as the main trading bot project.
