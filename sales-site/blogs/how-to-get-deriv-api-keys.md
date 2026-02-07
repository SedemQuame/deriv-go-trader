---
title: "How to Get Your Deriv API Keys Securely"
date: "2026-01-05"
description: "Learn how to generate and secure your Deriv API tokens for use with Deriv Go Trader."
---

# How to Get Your Deriv API Keys Securely

To allow Deriv Go Trader to execute trades on your behalf, you need to provide it with an API Token. This token acts as a secure key, giving the bot permission to trade without needing your main account password.

## Step 1: Log in to Deriv

Go to [Deriv.com](https://deriv.com) and log in to your account.

![Placeholder: Image of Deriv login page]

## Step 2: Navigate to API Settings

1. Click on your **Profile Icon** in the top right corner.
2. Select **"Security & Safety"** or **"Settings"**.
3. Click on the **"API Token"** tab from the menu.

![Placeholder: Image showing navigation to the API Token settings page]

## Step 3: Create a New Token

You will see a screen allowing you to create a new token. It is crucial to select the correct permissions (scopes) for the bot to function correctly while maintaining security.

1. **Choose Scopes**: Select the following permissions:
   - **Read**: Allows the bot to see your balance and open positions.
   - **Trade**: Allows the bot to buy and sell contracts.
   - **Trading Information**: Allows access to trade history.
   
   > **Warning:** Do NOT select "Payments" or "Admin". The bot does not need these permissions, and it is safer to keep them disabled.

![Placeholder: Image showing the scope selection checkboxes with Read and Trade selected]

2. **Name Your Token**: Give it a recognizable name, such as "DerivGoTrader".
3. Click **"Create"**.

## Step 4: Copy and Secure Your Token

Once created, your token will appear in the list below.

1. Click the **"Copy"** button next to your new token.
2. **Paste** this token immediately into the Deriv Go Trader setup wizard.

![Placeholder: Image showing the created API token and the copy button]

## Security Best Practices

- **Never share your API token** with anyone.
- **Do not post screenshots** of your raw API token on social media.
- If you suspect your token has been compromised, go back to the API Token page on Deriv and click **Delete** next to the token immediately. You can then generate a new one.

With your API key ready, you can now proceed to [Setup the Application](./how-to-setup-application.md).
