import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchase extends Document {
    stripeSessionId: string;
    customerEmail: string;
    amount: number;
    currency: string;
    status: string; // 'completed', 'verified'
    createdAt: Date;
}

const PurchaseSchema: Schema = new Schema({
    stripeSessionId: { type: String, required: true, unique: true },
    customerEmail: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now },
});

// Prevent overwriting model if already compiled
export default mongoose.models.Purchase || mongoose.model<IPurchase>('Purchase', PurchaseSchema);
