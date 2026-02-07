# Deriv Go Trader

A professional, high-performance automated trading platform for Deriv.com, built with **Go** (for speed), **Electron** (for cross-platform desktop usage), and **Next.js** (for the sales/distribution platform).

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Go Version](https://img.shields.io/badge/go-1.19%2B-00ADD8.svg)
![Electron](https://img.shields.io/badge/electron-29.x-47848F.svg)

## 🚀 Overview

This project is a complete ecosystem for algorithmic trading on Deriv. It consists of three main components:

1.  **Core Trading Engine (Go)**: A fast, concurrent trading bot supporting multiple strategies (Martingale, D'Alembert, etc.) and risk management.
2.  **Desktop Application (Electron)**: A user-friendly desktop app (Windows, Mac, Linux) that bundles the Go engine and a web dashboard for easy control and visualization.
3.  **Sales Platform (Next.js)**: A fully integrated e-commerce website with Stripe payment processing to sell and distribute the software.

---

## ✨ Features

### 🤖 Trading Strategies
*   **Even/Odd**: Statistical pattern matching on digit analysis.
*   **Rise/Fall**: Trend-following logic using recent tick history.
*   **Digit Differs**: High-probability betting on digit changes.
*   **Higher/Lower**: Barrier-based trading for volatile markets.
*   **Multipliers**: Leveraged trading with time-based exits.

### 🛡️ Risk Management
*   **Smart Martingale**: Configurable stake multipliers with a "Safety Brake" to prevent blowing accounts.
*   **Trailing Stop Loss**: Locks in profits as the market moves in your favor.
*   **Take Profit / Stop Loss**: Hard limits to secure sessions.
*   **Risk Buffer**: Automatically checks available capital before increasing stakes.

### 🖥️ Desktop Application
*   **Visual Dashboard**: Real-time charts, PnL tracking, and trade history.
*   **Bot Control**: Start/Stop strategies directly from the UI.
*   **Cross-Platform**: Native installers for **Windows (.exe)**, **macOS (.dmg)**, and **Linux (.AppImage/.deb)**.

---

## 🛠️ Installation & Build

### Prerequisites
*   **Go** (1.19+)
*   **Node.js** (20+) & **NPM**
*   **Git**

### 1. Build the Desktop App
We provide a unified build script to generate installers for all platforms.

```bash
# Clone the repository
git clone https://github.com/sedemquame/deriv-go-trader.git
cd deriv-go-trader

# Install Go dependencies
go mod tidy

# Build for your platform
./build.sh mac      # Build macOS (.dmg)
./build.sh win      # Build Windows AMD64 (.exe)
./build.sh arm64    # Build Windows ARM64 (.exe)
./build.sh linux    # Build Linux (.AppImage, .deb)
```

The compiled installers will be located in **`electron/dist/`**.

### 2. Run Locally (Development)
To develop the frontend and backend simultaneously:

```bash
# Terminal 1: Start the Desktop App (Electron)
cd electron
npm install
npm start
```

*Note: The Electron app expects the Go binaries (`webserver` and `deriv_trade`) to be present in the root or `electron/build_resources` directory if running in dev mode.*

---

## 🌐 Sales & Distribution Site

The project includes a complete sales website located in `sales-site/`.

### Features
*   **Stripe Integration**: Secure one-time payment flow.
*   **Purchase Recovery**: Users can verify their email to re-download files.
*   **Admin Webhook**: Automatically saves customer orders to a MongoDB database.
*   **Modern UI**: Built with Next.js 14, Tailwind CSS, and Framer Motion.

### Setup

1.  Navigate to the site directory:
    ```bash
    cd sales-site
    ```
2.  Create `.env.local` and add your keys (see `sales-site/SETUP.md`):
    ```env
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
    STRIPE_SECRET_KEY=sk_test_...
    STRIPE_WEBHOOK_SECRET=whsec_...
    MONGODB_URI=mongodb://localhost:27017/sales_site
    ```
3.  Run the development server:
    ```bash
    npm install
    npm run dev
    ```
    Visit `http://localhost:3000`.

---

## 🔧 CLI Usage (Advanced)

You can run the trading bot directly from the command line without the GUI.

```bash
# Example: Run Even/Odd strategy with Martingale
go run main.go -strategy even_odd -martingale 2.1 -stake 1.0

# Example: Run Rise/Fall with 5 tick duration
go run main.go -strategy rise_fall -duration 5 -unit t
```

### Common Flags
| Flag | Description | Default |
| :--- | :--- | :--- |
| `-strategy` | `even_odd`, `rise_fall`, `differs`, `higher_lower` | `even_odd` |
| `-stake` | Initial stake amount (USD) | `0.35` |
| `-martingale` | Stake multiplier after loss | `2.1` |
| `-target_profit` | Stop trading after reaching profit | `10.0` |
| `-stop_loss` | Stop trading after losing amount | `50.0` |
| `-trailing_stop` | Enable trailing stop loss via config | `true` |

---

## ⚠️ Disclaimer

**Trading involves significant risk.** This software is provided for educational and research purposes only.
*   Always test on a **Demo Account** first.
*   The authors are not responsible for financial losses.
*   This is not financial advice.

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
