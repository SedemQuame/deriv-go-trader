'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { pricing } from '@/app/lib/pricing';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export function CheckoutButton() {
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error('Failed to create session', data);
                alert('Failed to initiate checkout. Please check console.');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleCheckout}
            disabled={loading}
            className="font-bold py-4 px-8 rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
                background: 'var(--primary)',
                color: 'var(--primary-text)',
            }}
        >
            {loading ? 'Processing...' : `Get Lifetime Access - ${pricing.display}`}
        </button>
    );
}

export function CheckoutButtonFull() {
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error('Failed to create session', data);
                alert('Failed to initiate checkout. Please check console.');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleCheckout}
            disabled={loading}
            className="font-bold py-4 px-10 rounded-lg transition-all shadow-lg text-lg w-full"
            style={{
                background: 'var(--primary)',
                color: 'var(--primary-text)',
            }}
        >
            Buy Now
        </button>
    );
}
