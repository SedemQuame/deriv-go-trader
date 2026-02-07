import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Purchase from '@/models/Purchase';

export async function GET(req: Request) {
    try {
        await dbConnect();
        const url = new URL(req.url);
        const seed = url.searchParams.get('seed');
        const clear = url.searchParams.get('clear');
        const email = url.searchParams.get('email') || 'test@example.com';

        if (clear === 'true') {
            await Purchase.deleteMany({});
            return NextResponse.json({ message: 'Database cleared.' });
        }

        if (seed === 'true') {
            const dummyPurchase = new Purchase({
                stripeSessionId: `test_session_${Date.now()}`,
                customerEmail: email,
                amount: 4900,
                currency: 'usd',
                status: 'paid',
            });
            await dummyPurchase.save();
            return NextResponse.json({ message: 'Seeded dummy purchase', purchase: dummyPurchase });
        }

        const purchases = await Purchase.find({}).sort({ createdAt: -1 });
        return NextResponse.json({
            count: purchases.length,
            purchases
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
