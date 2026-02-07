import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Purchase from '@/models/Purchase';


export async function GET() {
    return NextResponse.json({ message: 'Recover API is working. Please use POST to verify email.' });
}

export async function POST(req: Request) {
    console.log('Recover API hit');
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        await dbConnect();

        // Case-insensitive search for paid purchase
        const purchase = await Purchase.findOne({
            customerEmail: { $regex: new RegExp(`^${email}$`, 'i') },
            status: 'paid'
        });

        if (purchase) {
            return NextResponse.json({ valid: true });
        } else {
            return NextResponse.json({ valid: false, message: 'No purchase found for this email.' }, { status: 404 });
        }

    } catch (error) {
        console.error('Recover API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
