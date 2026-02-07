---
title: "How to Setup Deriv Go Trader"
date: "2026-01-05"
description: "A step-by-step guide to installing and setting up the Deriv Go Trader application on Windows, macOS, and Linux."
---

# How to Setup Deriv Go Trader

Getting started with Deriv Go Trader is a seamless process. Whether you are on Windows, macOS, or Linux, our installer handles everything for you. Follow this guide to get your trading bot up and running in minutes.

## Prerequisites

Before you begin, ensure you have the following:

- An active **Deriv account** (You'll need this for your API keys).
- A stable internet connection.
- **MongoDB connection string** (We'll cover how to get this in another guide, or you can use a local instance).

![Deriv Go Trader dashboard in light mode](/images/blog/light-mode.jpg)

## Installation Steps

### 1. Download the Installer

After purchasing Deriv Go Trader, you will receive links to download the installer for your operating system.

- **Windows**: Download the `.exe` file.
- **macOS**: Download the `.dmg` file.
- **Linux**: Download the `.AppImage` file.

### 2. Install on Your OS

#### Windows
1. Double-click the downloaded `.exe` file.
2. You might see a "Windows protected your PC" popup (SmartScreen). Click "More info" and then "Run anyway" (this happens because we are a niche software provider).
3. The installer will extract the files and launch the application automatically.

#### macOS
1. Double-click the downloaded `.dmg` file.
2. Drag the "Deriv Go Trader" icon into your **Applications** folder.
3. Open Finder, go to Applications, and double-click "Deriv Go Trader".
4. If you see a security warning ("App cannot be verified"), Go to **System Settings > Privacy & Security** and click "Open Anyway".

#### Linux
1. Right-click the `.AppImage` file and select **Properties**.
2. Go to the **Permissions** tab and ensure "Allow executing file as program" is checked.
3. Double-click the file to run it.

## First Launch & Configuration

Once the application launches for the first time, you will be greeted by the Setup Wizard. This wizard ensures your bot is connected securely to Deriv and your database.

1. **API Key**: Enter your Deriv API Key. (Don't have one? Check our guide on [How to get Deriv API keys securely](./how-to-get-deriv-api-keys.md)).
2. **MongoDB URI**: Enter your MongoDB connection string. (Need help? See [How to setup Mongo database](./how-to-setup-mongo-database.md)).

![Setup wizard with API key and MongoDB configuration](/images/blog/settings.png)

3. Click **"Save & Continue"**.
4. The app will validate your credentials. If successful, you will be taken to the main dashboard.

## Configuring your First Bot

Now that you are in, verify everything is working:
1. Look for the **"Status: Connected"** indicator in the top right corner.
2. You should see your account balance reflect your Deriv account.

![Main dashboard showing connected status](/images/blog/dark-mode.jpg)

You are now ready to start trading! Check out our next guide on [How to place a trade](./how-to-place-a-trade.md).
