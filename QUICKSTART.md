# MongoDB & Web Dashboard Integration - Quick Reference

## 🎯 What's New

Your Deriv trading bot now includes:

1. **MongoDB Integration** - All trades are automatically saved to a database
2. **Web Dashboard** - Beautiful real-time UI to monitor performance with **interactive charts**
3. **Session Tracking** - Track individual trading sessions
4. **Statistics API** - REST endpoints for trade data
5. **Chart.js Visualizations** - Three dynamic charts showing PnL trends, win/loss ratios, and profit distribution

## 🚀 Quick Start
### Desktop App (Recommended)
We provide a standalone desktop application for Windows, Mac, and Linux.

**Build:**
Run the build script to generate the installer for your OS:
```bash
./build.sh mac   # or win, linux
```
The output will be in `electron/dist/`.

**Run:**
Simply open the generated application. On first run, it will ask for your **Deriv API Token**.

### Manual Run (3 Steps)
If you prefer running via terminal:

### Step 1: Start MongoDB

**Option A - Docker (Recommended):**
```bash
docker-compose up -d
```

**Option B - Homebrew:**
```bash
brew services start mongodb-community
```

### Step 2: Start Web Dashboard
```bash
go run cmd/webserver/main.go
```
Dashboard will be available at: http://localhost:8080

### Step 3: Start Trading Bot
```bash
export DERIV_API_TOKEN="your_token_here"
go run main.go -strategy even_odd
```

## 📊 Dashboard Features

- **Real-time Stats**: Total PnL, Win Rate, Trade Count, Average Profit
- **Interactive Charts**:
  - **PnL Over Time**: Line chart showing cumulative profit/loss progression
  - **Win/Loss Distribution**: Doughnut chart visualizing your win rate
  - **Profit Distribution**: Bar chart showing individual trade profits (last 20 trades)
- **Trade History**: Detailed table with all trades
- **Session Analytics**: Performance metrics per session
- **Strategy Filtering**: Filter by specific strategies
- **Auto-refresh**: Updates every 30 seconds
- **Beautiful UI**: Modern dark mode with smooth animations powered by Chart.js

## 🔧 Alternative: Use the Start Script

We've created an interactive script that handles everything:

```bash
./start.sh
```

This will:
1. Check if MongoDB is running
2. Build the applications
3. Let you choose what to run (bot, dashboard, or both)
4. Handle cleanup on exit

## 📁 Project Structure

```
deriv-go-trader/
├── database/              # MongoDB integration
│   ├── models.go         # Data models (Trade, Session)
│   └── client.go         # Database operations
├── cmd/webserver/        # Web server
│   └── main.go          # API endpoints
├── web/                  # Frontend
│   ├── index.html       # Dashboard UI
│   ├── style.css        # Styling
│   ├── app.js           # JavaScript
│   └── README.md        # Dashboard docs
├── strategy/             # Trading strategies (updated with DB)
├── main.go              # Trading bot (updated with DB)
├── start.sh             # Quick start script
└── docker-compose.yml   # MongoDB setup
```

## 🔌 API Endpoints

The web server exposes these endpoints:

- `GET /api/trades?strategy=even_odd&limit=50` - Get trades
- `GET /api/sessions?limit=10` - Get sessions
- `GET /api/stats?strategy=even_odd` - Get statistics
- `GET /` - Dashboard UI

## 💾 Database Schema

### Trade Document
```json
{
  "strategy": "even_odd",
  "symbol": "R_10",
  "contract_type": "EVEN/ODD",
  "stake": 6.89,
  "profit": 12.45,
  "status": "won",
  "balance": 1234.56,
  "total_pnl": 45.67,
  "duration": 2,
  "duration_unit": "t",
  "timestamp": "2025-12-12T23:00:00Z"
}
```

### Session Document
```json
{
  "strategy": "even_odd",
  "start_time": "2025-12-12T22:00:00Z",
  "total_trades": 25,
  "winning_trades": 15,
  "losing_trades": 10,
  "total_pnl": 45.67,
  "max_pnl": 67.89,
  "initial_stake": 6.89
}
```

## 🌍 Environment Variables

```bash
# Required
export DERIV_API_TOKEN="your_token"

# Optional
export MONGO_URI="mongodb://localhost:27017"  # Default
export PORT="8080"                             # Web server port
```

## 🎨 Dashboard Screenshots

The dashboard features:
- **Gradient backgrounds** with glassmorphism effects
- **Smooth animations** on hover and interactions
- **Color-coded PnL** (green for profit, red for loss)
- **Responsive design** (works on mobile and desktop)
- **Real-time updates** with auto-refresh

## 🔍 Monitoring Your Trades

1. **Start everything** using `./start.sh` or manually
2. **Open dashboard** at http://localhost:8080
3. **Watch trades** appear in real-time as the bot executes
4. **Filter by strategy** using the dropdown
5. **Click refresh** to update immediately

## 🛠️ Troubleshooting

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
brew services list | grep mongodb
# OR
docker ps | grep mongo

# Start it if needed
brew services start mongodb-community
# OR
docker-compose up -d
```

### No Trades Showing
- Ensure the bot is running with `DERIV_API_TOKEN` set
- Check that MongoDB is connected (look for "Connected to MongoDB" in logs)
- Verify the web server is running on port 8080

### Port Already in Use
```bash
# Change web server port
PORT=8081 go run cmd/webserver/main.go
```

## 📚 Next Steps

1. **Test on Demo Account** - Always test first!
2. **Monitor Performance** - Use the dashboard to track results
3. **Adjust Strategies** - Modify parameters based on data
4. **Export Data** - Use MongoDB tools to export for analysis

## 🎓 Learning Resources

- MongoDB: https://docs.mongodb.com/
- Deriv API: https://api.deriv.com/
- Go: https://go.dev/doc/

## ⚠️ Important Notes

- **Always test on demo accounts first**
- **Monitor your trades closely**
- **Set appropriate stop losses**
- **Never risk more than you can afford to lose**
- **Trading involves significant risk**

---

**Happy Trading! 🚀**

For more details, see:
- Main README: [README.md](README.md)
- Dashboard README: [web/README.md](web/README.md)
