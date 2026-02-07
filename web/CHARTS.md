# Dashboard Charts Guide

## Overview

The Deriv Trading Dashboard now includes three interactive charts powered by Chart.js, providing visual insights into your trading performance.

## Charts

### 1. PnL Over Time (Line Chart)

**Location**: Top-left of charts section

**Purpose**: Shows the progression of your cumulative profit/loss over your trading session

**Features**:
- Smooth purple gradient line
- Shows cumulative PnL for up to 50 recent trades
- Hover to see exact PnL value at each trade
- Automatically updates with new trades
- Filled area under the line for better visualization

**Interpretation**:
- Upward trend = Profitable trading
- Downward trend = Losing streak
- Flat sections = Break-even periods

### 2. Win/Loss Distribution (Doughnut Chart)

**Location**: Top-right of charts section

**Purpose**: Visualizes your overall win rate as a percentage

**Features**:
- Green segment = Winning trades
- Red segment = Losing trades
- Shows exact count and percentage on hover
- Legend at the bottom
- Responsive to strategy filtering

**Interpretation**:
- Larger green segment = Higher win rate
- Aim for at least 50% green for most strategies
- Digit Differs should show ~90% green

### 3. Profit Distribution (Bar Chart)

**Location**: Full-width below the other charts

**Purpose**: Shows individual trade profits for the last 20 trades

**Features**:
- Green bars = Profitable trades
- Red bars = Losing trades
- Bar height represents profit/loss amount
- Hover to see exact profit value
- Rounded corners for modern look

**Interpretation**:
- Consistent bar heights = Stable trading
- Increasing red bars = Martingale in action
- Pattern recognition for strategy optimization

## Chart Interactions

### Hover Effects
- Hover over any data point to see detailed information
- Tooltips show formatted currency values
- Chart elements highlight on hover

### Auto-Update
- Charts refresh automatically every 30 seconds
- Manual refresh available via the refresh button
- Smooth transitions between updates

### Strategy Filtering
- Use the strategy dropdown to filter charts
- All three charts update simultaneously
- Shows data only for selected strategy

## Technical Details

### Chart.js Configuration

**Colors**:
- Primary (PnL line): `#6366f1` (Purple)
- Success (Wins): `#10b981` (Green)
- Danger (Losses): `#ef4444` (Red)
- Text: `#cbd5e1` (Light gray)
- Grid: `#334155` (Dark gray)

**Fonts**:
- Family: Inter
- Size: 12px for labels
- Color: Matches dark theme

**Animations**:
- Smooth transitions on data updates
- Easing: Default Chart.js easing
- Duration: ~400ms

### Data Processing

**PnL Chart**:
```javascript
// Sorts trades by timestamp
// Maps to cumulative PnL values
// Labels as trade numbers (#1, #2, etc.)
```

**Win/Loss Chart**:
```javascript
// Filters trades by profit >= 0 (wins)
// Counts wins vs losses
// Calculates percentages
```

**Profit Distribution**:
```javascript
// Takes last 20 trades
// Maps profit values
// Colors based on profit sign
```

## Customization

### Changing Chart Colors

Edit `web/app.js`:

```javascript
// PnL Chart
borderColor: '#6366f1',  // Line color
backgroundColor: 'rgba(99, 102, 241, 0.1)',  // Fill color

// Win/Loss Chart
backgroundColor: [
    'rgba(16, 185, 129, 0.8)',  // Win color
    'rgba(239, 68, 68, 0.8)'    // Loss color
]
```

### Adjusting Chart Height

Edit `web/style.css`:

```css
.chart-container {
    height: 300px;  /* Change this value */
}
```

### Changing Number of Trades Shown

Edit `web/app.js`:

```javascript
// PnL Chart - change limit in loadTrades()
const url = '/api/trades?limit=50';  // Change 50 to desired number

// Profit Distribution - change slice
sortedTrades.slice(-20)  // Change -20 to desired number
```

## Responsive Design

### Desktop (> 1024px)
- Charts displayed in 2-column grid
- Profit distribution spans full width
- All charts visible simultaneously

### Tablet (768px - 1024px)
- Charts stack vertically
- Each chart takes full width
- Maintains readability

### Mobile (< 768px)
- Single column layout
- Charts scale to fit screen
- Touch-friendly interactions

## Performance

### Optimization
- Charts only update when data changes
- Efficient data processing
- Minimal re-renders
- Smooth 60fps animations

### Data Limits
- PnL Chart: Last 50 trades (configurable)
- Win/Loss Chart: All trades in current filter
- Profit Distribution: Last 20 trades (configurable)

## Troubleshooting

### Charts Not Showing

**Issue**: Blank chart areas

**Solutions**:
1. Check browser console for errors
2. Verify Chart.js CDN is loading
3. Ensure trades data is being fetched
4. Check MongoDB connection

### Charts Not Updating

**Issue**: Data doesn't refresh

**Solutions**:
1. Click the manual refresh button
2. Check auto-refresh is enabled
3. Verify API endpoints are responding
4. Check browser network tab

### Performance Issues

**Issue**: Slow chart rendering

**Solutions**:
1. Reduce number of trades displayed
2. Clear browser cache
3. Check for console errors
4. Reduce auto-refresh frequency

## Best Practices

### Monitoring
1. **Check PnL Chart** for overall trend
2. **Verify Win Rate** is acceptable for your strategy
3. **Analyze Profit Distribution** for consistency
4. **Use Strategy Filter** to compare performance

### Strategy Optimization
1. Compare charts across different strategies
2. Look for patterns in losing streaks
3. Identify optimal entry/exit points
4. Adjust parameters based on visual feedback

### Risk Management
1. Watch for steep downward trends in PnL
2. Monitor win rate dropping below target
3. Check for increasing loss sizes in distribution
4. Set alerts based on chart patterns

## Future Enhancements

Potential additions:
- Strategy comparison overlay
- Time-based filtering (hourly, daily, weekly)
- Drawdown visualization
- Risk/reward ratio chart
- Export chart data to CSV
- Custom date range selection
- Multiple timeframe analysis

## Resources

- Chart.js Documentation: https://www.chartjs.org/docs/
- Color Palette: https://tailwindcss.com/docs/customizing-colors
- Dashboard Code: `web/app.js`
- Styling: `web/style.css`

---

**Tip**: Use the charts in combination with the statistics and trade table for comprehensive analysis of your trading performance!
