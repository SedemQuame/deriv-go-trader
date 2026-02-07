# Screenshot Guide for Deriv Go Trader

## Directory Structure
All screenshots should be saved in:
```
sales-site/public/images/blog/
```

## How to Reference Images in Blog Posts

In your markdown files (`.md`), use this format:
```markdown
![Alt text description](/images/blog/filename.png)
```

Example:
```markdown
![Dashboard showing connected status](/images/blog/setup-03-connected.png)
```

---

## Required Screenshots

### 📊 1. Marketing Screenshots (For Homepage & General Use)

**Purpose:** Show off the app's performance and UI

**Steps:**
1. Run the faker script:
   ```bash
   cd sales-site
   node scripts/results_faker.js add
   ```
2. Open the dashboard at `http://localhost:8080`
3. Take these screenshots:

| Filename | What to Capture | Where to Use |
|----------|----------------|--------------|
| `dashboard-light.png` | Full dashboard in **Light Mode** with fake winning trades | Homepage hero section |
| `dashboard-dark.png` | Full dashboard in **Dark Mode** with fake winning trades | Homepage features section |
| `dashboard-charts.png` | Close-up of the PnL chart showing upward trend | Blog posts, marketing |
| `dashboard-winloss.png` | Win/Loss pie chart showing high win rate | Blog posts |

4. Clean up fake data:
   ```bash
   node scripts/results_faker.js clean
   ```

---

### 🔧 2. Setup Guide Screenshots

**Blog Post:** `blogs/how-to-setup-application.md`

| Filename | What to Capture | Markdown Reference |
|----------|----------------|-------------------|
| `setup-01-download.png` | Downloads folder showing the `.dmg`, `.exe`, or `.AppImage` file | `![Downloaded installer](/images/blog/setup-01-download.png)` |
| `setup-02-wizard.png` | Setup modal asking for API Token and MongoDB URI | `![Setup wizard](/images/blog/setup-02-wizard.png)` |
| `setup-03-connected.png` | Dashboard with "Connected" status in top-right corner | `![Connected status](/images/blog/setup-03-connected.png)` |

**How to Update the Blog:**
Open `sales-site/blogs/how-to-setup-application.md` and replace placeholder text like:
```markdown
![Placeholder: Image showing the system requirements or a 'Ready to Install' graphic]
```
with:
```markdown
![Downloaded installer](/images/blog/setup-01-download.png)
```

---

### 🔑 3. API Keys Guide Screenshots

**Blog Post:** `blogs/how-to-get-deriv-api-keys.md`

| Filename | What to Capture | Markdown Reference |
|----------|----------------|-------------------|
| `api-01-deriv-settings.png` | Deriv.com → Account Settings page | `![Deriv account settings](/images/blog/api-01-deriv-settings.png)` |
| `api-02-token-scopes.png` | API Token creation form with "Read" and "Trade" checked | `![API token scopes](/images/blog/api-02-token-scopes.png)` |
| `api-03-token-created.png` | Token list showing the new token with copy button | `![Created API token](/images/blog/api-03-token-created.png)` |

**Steps:**
1. Go to https://app.deriv.com
2. Navigate to Settings → API Token
3. Take screenshots as you create a new token

---

### 🗄️ 4. MongoDB Setup Screenshots

**Blog Post:** `blogs/how-to-setup-mongo-database.md`

| Filename | What to Capture | Markdown Reference |
|----------|----------------|-------------------|
| `mongo-01-create-cluster.png` | MongoDB Atlas "Build a Database" screen | `![Create MongoDB cluster](/images/blog/mongo-01-create-cluster.png)` |
| `mongo-02-free-tier.png` | Selecting the Free tier (M0) | `![Select free tier](/images/blog/mongo-02-free-tier.png)` |
| `mongo-03-network-access.png` | Network Access tab with IP whitelist | `![Network access settings](/images/blog/mongo-03-network-access.png)` |
| `mongo-04-connection-string.png` | Connection string modal | `![MongoDB connection string](/images/blog/mongo-04-connection-string.png)` |

**Steps:**
1. Go to https://cloud.mongodb.com
2. Create a new cluster (or use existing)
3. Take screenshots during setup

---

### 📈 5. Trading Guide Screenshots

**Blog Post:** `blogs/how-to-place-a-trade.md`

| Filename | What to Capture | Markdown Reference |
|----------|----------------|-------------------|
| `trade-01-full-dashboard.png` | Clean dashboard before starting bot | `![Trading dashboard](/images/blog/trade-01-full-dashboard.png)` |
| `trade-02-strategy-select.png` | Strategy dropdown menu open | `![Select trading strategy](/images/blog/trade-02-strategy-select.png)` |
| `trade-03-bot-config.png` | Bot Control panel with all settings visible | `![Bot configuration](/images/blog/trade-03-bot-config.png)` |
| `trade-04-bot-running.png` | Dashboard with bot running (green status badge) | `![Bot running](/images/blog/trade-04-bot-running.png)` |
| `trade-05-live-trades.png` | Recent Trades tab showing live trade results | `![Live trade results](/images/blog/trade-05-live-trades.png)` |

---

## Quick Reference: Update Blog Posts

### Example: Updating `how-to-setup-application.md`

**Before:**
```markdown
![Placeholder: Image showing the download page with buttons for Windows, Mac, and Linux]
```

**After:**
```markdown
![Downloaded installer in Downloads folder](/images/blog/setup-01-download.png)
```

### Find and Replace Pattern

Search for: `![Placeholder:`
Replace with your actual image references.

---

## Checklist

- [ ] Create `sales-site/public/images/blog/` directory
- [ ] Take all marketing screenshots (light & dark mode)
- [ ] Take setup guide screenshots (3 images)
- [ ] Take API keys guide screenshots (3 images)
- [ ] Take MongoDB guide screenshots (4 images)
- [ ] Take trading guide screenshots (5 images)
- [ ] Update all 4 blog markdown files with image references
- [ ] Test that images load on the website

---

## Testing Images

After adding images, test them:

1. Start the sales site:
   ```bash
   cd sales-site
   npm run dev
   ```

2. Visit: `http://localhost:3000/blog/how-to-setup-application`

3. Verify all images load correctly

---

## Pro Tips

1. **Consistent Size:** Try to keep screenshots at similar widths (1200-1600px recommended)
2. **Clean UI:** Close unnecessary browser tabs/windows before capturing
3. **Highlight Important Areas:** Use arrows or boxes to draw attention (optional)
4. **File Format:** PNG for UI screenshots (better quality), JPG for photos
5. **Naming Convention:** Use descriptive kebab-case names (e.g., `setup-wizard-api-input.png`)
