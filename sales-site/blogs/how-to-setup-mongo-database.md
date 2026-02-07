---
title: "How to Setup MongoDB for Deriv Go Trader"
date: "2026-01-05"
description: "A guide to setting up a free MongoDB database to store your trading history and bot configurations."
---

# How to Setup MongoDB for Deriv Go Trader

Deriv Go Trader uses a database to store your trade history, performance analytics, and bot configurations locally or in the cloud. We recommend using **MongoDB Atlas** for a free, secure, and always-on cloud database.

## Option A: MongoDB Atlas (Cloud - Recommended)

This is the easiest way to get started. You don't need to install anything on your computer.

### 1. Create an Account
Go to [MongoDB.com](https://www.mongodb.com/cloud/atlas/register) and register for a free account.

![Placeholder: Image of MongoDB Atlas sign-up page]

### 2. Create a Cluster
1. Once logged in, click **"Build a Database"**.
2. Select the **"M0 Shared (Free)"** tier.
3. Choose a provider (AWS, Google Cloud, or Azure) close to your location.
4. Click **"Create"**.

![Placeholder: Image showing the Free Tier cluster selection screen]

### 3. Setup User Access
1. You will be asked to create a database user.
2. Enter a **Username** (e.g., `trader`) and a **Password**.
3. **IMPORTANT**: Write down this password! You will need it for the connection string.
4. Click **"Create User"**.

### 4. Network Access (Allow IP)
1. Scroll down to "Where would you like to connect from?".
2. Select **"My Local Environment"** (adds your current IP) or **"Allow Access from Anywhere"** (easier for dynamic IPs).
   - *Note: "Allow Access from Anywhere" means `0.0.0.0/0`. While convenient, it's slightly less secure than whitelisting specific IPs.*
3. Click **"Add Entry"** and then **"Finish and Close"**.

![Placeholder: Image showing Network Access IP whitelist configuration]

### 5. Get Connection String
1. Go back to your dashboard (Database deployment).
2. Click **"Connect"**.
3. Select **"Drivers"**.
4. You will see a connection string like this:
   `mongodb+srv://<username>:<password>@cluster0.abcd.mongodb.net/?retryWrites=true&w=majority`
5. **Copy** this string.

![Placeholder: Image showing the connection string modal]

### 6. Configure Deriv Go Trader
1. Paste the connection string into the MongoDB URI field in the Deriv Go Trader setup.
2. **Replace `<password>`** with the actual password you created in Step 3.

## Option B: Local MongoDB (Advanced)

If you prefer to keep everything offline, you can install MongoDB Community Edition on your machine.

1. Download MongoDB Community Server from the [official website](https://www.mongodb.com/try/download/community).
2. Install it following the instructions for your OS.
3. Once running, your connection string is typically:
   `mongodb://localhost:27017/deriv-trader`

![Placeholder: Image of MongoDB Compass or local terminal showing connection]

That's it! Your database is now ready to log your profitable trades.
