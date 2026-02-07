# Pricing Configuration Guide

## Overview

The sales website pricing is now fully configurable via environment variables. This allows you to easily change the price, currency, and currency symbol without modifying code.

## Environment Variables

Add these to your `.env.local` file:

```bash
# Pricing Configuration
NEXT_PUBLIC_PRICE_AMOUNT=29.99
NEXT_PUBLIC_PRICE_CURRENCY=USD
NEXT_PUBLIC_PRICE_SYMBOL=$
```

### Variables Explained

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NEXT_PUBLIC_PRICE_AMOUNT` | Price in decimal format | `29.99` | `49.99`, `19.50` |
| `NEXT_PUBLIC_PRICE_CURRENCY` | ISO currency code | `USD` | `EUR`, `GBP`, `CAD` |
| `NEXT_PUBLIC_PRICE_SYMBOL` | Currency symbol to display | `$` | `€`, `£`, `CA$` |

## Default Behavior

If environment variables are not set, the system defaults to:
- **Price:** USD 29.99
- **Currency:** USD
- **Symbol:** $

## Examples

### USD Pricing (Default)
```bash
NEXT_PUBLIC_PRICE_AMOUNT=29.99
NEXT_PUBLIC_PRICE_CURRENCY=USD
NEXT_PUBLIC_PRICE_SYMBOL=$
```
**Displays:** $29.99

### EUR Pricing
```bash
NEXT_PUBLIC_PRICE_AMOUNT=27.99
NEXT_PUBLIC_PRICE_CURRENCY=EUR
NEXT_PUBLIC_PRICE_SYMBOL=€
```
**Displays:** €27.99

### GBP Pricing
```bash
NEXT_PUBLIC_PRICE_AMOUNT=24.99
NEXT_PUBLIC_PRICE_CURRENCY=GBP
NEXT_PUBLIC_PRICE_SYMBOL=£
```
**Displays:** £24.99

### CAD Pricing
```bash
NEXT_PUBLIC_PRICE_AMOUNT=39.99
NEXT_PUBLIC_PRICE_CURRENCY=CAD
NEXT_PUBLIC_PRICE_SYMBOL=CA$
```
**Displays:** CA$39.99

## Where Pricing is Used

The pricing configuration is automatically applied to:

1. **Checkout Button** - "Get Lifetime Access - $29.99"
2. **Pricing Section** - Large price display on homepage
3. **Stripe Checkout** - Actual payment amount and currency
4. **All API Routes** - Consistent pricing across the application

## Implementation Details

### Centralized Configuration

All pricing logic is centralized in `app/lib/pricing.ts`:

```typescript
export const pricing = {
  amount: 29.99,           // Price in dollars
  amountCents: 2999,       // Price in cents (for Stripe)
  currency: 'USD',         // Currency code
  symbol: '$',             // Currency symbol
  display: '$29.99',       // Formatted display
  displayShort: '$29',     // Short format (no decimals)
};
```

### Files Updated

- ✅ `app/lib/pricing.ts` - Centralized pricing configuration
- ✅ `app/api/checkout/route.ts` - Stripe checkout with dynamic pricing
- ✅ `app/components/CheckoutButton.tsx` - Button text with dynamic price
- ✅ `app/page.tsx` - Homepage pricing display
- ✅ `.env.local` - Environment variables
- ✅ `.env.example` - Documentation for deployment

## Changing the Price

### For Development

1. Edit `sales-site/.env.local`
2. Update the pricing variables
3. Restart the dev server: `npm run dev`

### For Production (Heroku)

1. Go to your Heroku dashboard
2. Navigate to Settings → Config Vars
3. Add/update these variables:
   - `NEXT_PUBLIC_PRICE_AMOUNT`
   - `NEXT_PUBLIC_PRICE_CURRENCY`
   - `NEXT_PUBLIC_PRICE_SYMBOL`
4. Redeploy the application

## Important Notes

⚠️ **Stripe Currency Matching**
- Ensure the currency in your environment variables matches your Stripe account's supported currencies
- Stripe will reject transactions if the currency is not supported

⚠️ **Price Consistency**
- The price is automatically converted to cents for Stripe (e.g., 29.99 → 2999)
- Always use decimal format (e.g., `29.99`, not `2999`)

⚠️ **Environment Variable Prefix**
- Variables starting with `NEXT_PUBLIC_` are exposed to the browser
- This is necessary for client-side components to access the pricing

## Testing

After changing pricing:

1. **Check Homepage:** Visit http://localhost:3000
   - Verify price displays correctly in hero and pricing sections
   
2. **Check Button:** Click "Get Lifetime Access"
   - Verify button text shows correct price
   
3. **Check Stripe:** Complete a test checkout
   - Verify Stripe shows correct amount and currency

## Troubleshooting

### Price not updating?
- Restart the dev server (`npm run dev`)
- Clear browser cache (Cmd+Shift+R on Mac)
- Check `.env.local` file exists and has correct values

### Stripe currency error?
- Verify currency code is uppercase (e.g., `USD` not `usd`)
- Check your Stripe account supports the currency
- Ensure `NEXT_PUBLIC_PRICE_CURRENCY` matches Stripe's expected format

---

**Last Updated:** 2026-01-05
