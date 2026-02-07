import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { pricing } from '@/app/lib/pricing';

// Lazy initialization to prevent build-time errors when env vars are not available
function getStripe(): Stripe {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    return new Stripe(process.env.STRIPE_SECRET_KEY, {
        typescript: true,
    });
}

export async function POST() {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Stripe Secret Key not set' }, { status: 500 });
    }

    const stripe = getStripe();

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: pricing.currency.toLowerCase(),
                        product_data: {
                            name: 'Deriv Go Trader Desktop',
                            description: 'Lifetime license for Windows, Mac, and Linux',
                        },
                        unit_amount: pricing.amountCents,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/`,
        });

        return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (err: any) {
        console.error('Stripe Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
