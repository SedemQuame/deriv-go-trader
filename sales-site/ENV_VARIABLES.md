# Environment Variables Configuration

## Pricing Configuration

Configure pricing via environment variables in your `.env.local` file:

### Required Variables

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

### Optional Pricing Variables

```bash
# Price in cents (default: 4900 = $49.00)
NEXT_PUBLIC_PRICE_CENTS=4900

# Currency code (default: usd)
NEXT_PUBLIC_CURRENCY=usd

# Product name (default: Deriv Go Trader - Lifetime License)
NEXT_PUBLIC_PRODUCT_NAME=Deriv Go Trader - Lifetime License

# Optional: Use pre-configured Stripe Price ID
# STRIPE_PRICE_ID=price_xxxxxxxxxxxxx
```

### Other Variables

```bash
# MongoDB for purchase tracking
MONGODB_URI=mongodb://localhost:27017/deriv_sales

# Application base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Examples

### Change Price to $99

```bash
NEXT_PUBLIC_PRICE_CENTS=9900
```

### Change to EUR Currency

```bash
NEXT_PUBLIC_CURRENCY=eur
NEXT_PUBLIC_PRICE_CENTS=4900  # €49.00
```

### Use Stripe Price ID (Recommended for Production)

```bash
STRIPE_PRICE_ID=price_1234567890abcdef
```

When `STRIPE_PRICE_ID` is set, it will be used instead of dynamic pricing.
