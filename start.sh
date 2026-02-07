#!/bin/bash

# Deriv Trading Bot - Quick Start Script

set -e

echo "🚀 Deriv Trading Bot Setup"
echo "=========================="
echo ""

# Check if MongoDB is running
echo "📦 Checking MongoDB..."
if ! pgrep -x "mongod" > /dev/null 2>&1; then
    echo "⚠️  MongoDB is not running!"
    echo ""
    echo "To start MongoDB:"
    echo "  brew services start mongodb-community"
    echo "  OR"
    echo "  docker run -d -p 27017:27017 --name mongodb mongo:latest"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ MongoDB is running"
fi

# # Check API token
# if [ -z "$DERIV_API_TOKEN" ]; then
#     echo ""
#     echo "⚠️  DERIV_API_TOKEN not set!"
#     echo ""
#     read -p "Enter your Deriv API token: " token
#     export DERIV_API_TOKEN="$token"
# fi

echo "✅ API token configured"
echo ""

# Build the applications
echo "🔨 Building applications..."
go build -o deriv_trade
go build -o webserver ./cmd/webserver
echo "✅ Build complete"
echo ""

# Ask what to run
echo "What would you like to do?"
echo "1) Start web dashboard only"
echo "2) Start trading bot only"
echo "3) Start both (recommended)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🌐 Starting web dashboard..."
        echo "   Dashboard: http://localhost:8080"
        echo ""
        ./webserver
        ;;
    2)
        echo ""
        echo "Select strategy:"
        echo "1) even_odd"
        echo "2) rise_fall"
        echo "3) differs"
        echo "4) higher_lower"
        echo "5) multiplier"
        echo ""
        read -p "Enter choice (1-5): " strat_choice
        
        case $strat_choice in
            1) strategy="even_odd" ;;
            2) strategy="rise_fall" ;;
            3) strategy="differs" ;;
            4) strategy="higher_lower" ;;
            5) strategy="multiplier" ;;
            *) echo "Invalid choice"; exit 1 ;;
        esac
        
        echo ""
        echo "🤖 Starting trading bot with strategy: $strategy"
        echo ""
        ./deriv_trade -strategy "$strategy"
        ;;
    3)
        echo ""
        echo "Select strategy:"
        echo "1) even_odd"
        echo "2) rise_fall"
        echo "3) differs"
        echo "4) higher_lower"
        echo "5) multiplier"
        echo ""
        read -p "Enter choice (1-5): " strat_choice
        
        case $strat_choice in
            1) strategy="even_odd" ;;
            2) strategy="rise_fall" ;;
            3) strategy="differs" ;;
            4) strategy="higher_lower" ;;
            5) strategy="multiplier" ;;
            *) echo "Invalid choice"; exit 1 ;;
        esac
        
        echo ""
        echo "🌐 Starting web dashboard in background..."
        ./webserver > webserver.log 2>&1 &
        WEBSERVER_PID=$!
        echo "   Dashboard: http://localhost:8080"
        echo "   Logs: webserver.log"
        echo ""
        
        sleep 2
        
        echo "🤖 Starting trading bot with strategy: $strategy"
        echo ""
        
        # Trap to kill webserver on exit
        trap "echo ''; echo 'Stopping web server...'; kill $WEBSERVER_PID 2>/dev/null" EXIT
        
        ./deriv_trade -strategy "$strategy"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac
