import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '@/lib/db';
import Purchase from '@/models/Purchase';

// Lazy initialization to prevent build-time errors when env vars are not available
function getStripe(): Stripe {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    return new Stripe(process.env.STRIPE_SECRET_KEY, {
        typescript: true,
    });
}

export async function POST(req: Request) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const body = await req.text();
    console.log(`Webhook Hit. Method: ${req.method}, Body Length: ${body.length}`);
    const sig = req.headers.get('stripe-signature');

    // Bypass for local testing without Stripe CLI
    const url = new URL(req.url);
    console.log(url);

    let event: Stripe.Event; // Declare event here    

    if (process.env.NODE_ENV !== 'production' && url.searchParams.get('test_bypass') === 'true') {
        console.warn('Webhook Signature Verification Bypassed for Testing');
        try {
            console.log('Parsing bypass body:', body);
            event = JSON.parse(body);
        } catch (e) {
            console.error('Bypass JSON Parse Error:', e);
            return NextResponse.json({ error: 'Invalid JSON', body: body }, { status: 400 });
        }
    } else {
        if (!sig || !endpointSecret) {
            return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
        }
        try {
            event = getStripe().webhooks.constructEvent(body, sig, endpointSecret) as any;
        } catch (err: any) {
            console.error(`Webhook signature verification failed.`, err.message);
            return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
        }
    }
    console.log('event', event);

    // Handle the event
    if (event?.type === 'checkout.session.completed') {
        const session = (event as any).data.object as Stripe.Checkout.Session;
        console.log('Webhook: Checkout Session Completed', session);
        if (session.payment_status === 'paid') {
            try {
                await dbConnect();

                const email = session.customer_details?.email || session.customer_email;

                if (!email) {
                    console.error('Webhook Error: No email found in session', session.id);
                    // Decide if we want to throw or save with placeholder. Saving with placeholder is better than losing the record.
                }

                const purchase = new Purchase({
                    stripeSessionId: session.id,
                    customerEmail: email || 'unknown@example.com',
                    amount: session.amount_total,
                    currency: session.currency,
                    status: 'paid',
                });

                await purchase.save();
                console.log('Purchase saved:', purchase);

            } catch (err) {
                console.error('Error saving purchase to DB:', err);
                return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
            }
        }
    }

    return NextResponse.json({ received: true });
}
