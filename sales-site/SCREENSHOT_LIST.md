# Required Screenshots for Blog Posts

To make your "Guides & Resources" section visually appealing and helpful, please capture the following screenshots.

## 1. General Marketing
Use the `scripts/results_faker.js` to populate your local database with high-win-rate trades, then launch the Deriv Go Trader app.
- **Run Faker**: `node scripts/results_faker.js add`
- **Capture**: A screenshot of the **Dashboard** showing a nice upward trend in the performance graph and a list of green "won" trades.
- **Cleanup**: `node scripts/results_faker.js clean`

## 2. Guide: How to Setup Deriv Go Trader
*   **`setup-01-requirements.png`**: A shot of the folder containing the downloaded installer (e.g., Downloads folder).
*   **`setup-02-install-wizard.png`**: The first screen of your application's setup wizard asking for API Token and Mongo URI.
*   **`setup-03-connected.png`**: The main dashboard showing the "Status: Connected" indicator (top right).

## 3. Guide: How to Get Deriv API Keys
*   **`api-01-settings.png`**: The Deriv.com "Account Settings" menu or page.
*   **`api-02-scopes.png`**: The API Token creation form with "Read" and "Trade" scopes checked.
*   **`api-03-token-list.png`**: The list showing the newly created token and the "Copy" button.

## 4. Guide: How to Setup MongoDB
*   **`mongo-01-cluster.png`**: MongoDB Atlas "Build a Database" screen (selecting Free Tier).
*   **`mongo-02-network.png`**: The "Network Access" tab showing the IP whitelist entry.
*   **`mongo-03-connect.png`**: The modal showing the connection string (with `<password>` masked or highlighted).

## 5. Guide: How to Place a Trade
*   **`trade-01-dashboard.png`**: A clean shot of the full application interface.
*   **`trade-02-asset-select.png`**: The asset selection dropdown menu open.
*   **`trade-03-config.png`**: Close up of the right panel showing Stake, Strategy, and Stop Loss inputs.
*   **`trade-04-running.png`**: The dashboard while the bot is running (Green "Running" status, and logs in the console).

**Note:** Save these images in `sales-site/public/images/blog/` and update the markdown files to reference them (e.g., `/images/blog/setup-01.png`).
