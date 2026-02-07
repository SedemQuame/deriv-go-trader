// Pricing configuration from environment variables
// Default: USD 29.99 if not set

const PRICE_AMOUNT = parseFloat(process.env.NEXT_PUBLIC_PRICE_AMOUNT || '29.99');
const PRICE_CURRENCY = process.env.NEXT_PUBLIC_PRICE_CURRENCY || 'USD';
const PRICE_SYMBOL = process.env.NEXT_PUBLIC_PRICE_SYMBOL || '$';

export const pricing = {
    // Amount in dollars (e.g., 29.99)
    amount: PRICE_AMOUNT,

    // Amount in cents for Stripe (e.g., 2999)
    amountCents: Math.round(PRICE_AMOUNT * 100),

    // Currency code (e.g., 'USD', 'EUR', 'GBP')
    currency: PRICE_CURRENCY,

    // Currency symbol (e.g., '$', '€', '£')
    symbol: PRICE_SYMBOL,

    // Formatted display string (e.g., '$29.99')
    display: `${PRICE_SYMBOL}${PRICE_AMOUNT.toFixed(2)}`,

    // Formatted display without decimals (e.g., '$29')
    displayShort: `${PRICE_SYMBOL}${Math.floor(PRICE_AMOUNT)}`,
};

// For server-side usage
export function getPricing() {
    return pricing;
}
