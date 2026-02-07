const mongoose = require('mongoose');

// Configuration
const MONGO_URI = 'mongodb://localhost:27017/deriv_trader';
const STRATEGY_NAME = 'Marketing_Demo';

// Schema Definition matching the Go struct
const tradeSchema = new mongoose.Schema({
    strategy: String,
    symbol: String,
    contract_type: String,
    stake: Number,
    profit: Number,
    status: String,
    balance: Number,
    total_pnl: Number,
    duration: Number,
    duration_unit: Number, // Note: In Go it was String, but sometimes APIs change. Let's stick to String based on previous view. Wait, Go said String.
    timestamp: Date,
});

// Fix duration_unit to String as per Go model
mongoose.deleteModel(/Trade/); // Ensure no model collision if re-run
const Trade = mongoose.model('Trade', new mongoose.Schema({
    strategy: String,
    symbol: String,
    contract_type: String, // "CALL" or "PUT"
    stake: Number,
    profit: Number,
    status: String, // "won" or "lost"
    balance: Number,
    total_pnl: Number,
    duration: Number,
    duration_unit: String, // "t", "s", "m"
    timestamp: Date,
}, { collection: 'trades' })); // Force collection name to matches Go 'trades'

async function connect() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
}

async function addFakeResults() {
    console.log('Generating fake winning trades...');

    const count = 50;
    const startBalance = 1000;
    let currentBalance = startBalance;
    let totalPnL = 0;
    const trades = [];
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - 2); // Start 2 hours ago

    for (let i = 0; i < count; i++) {
        // 80% Win Rate for marketing
        const isWin = Math.random() > 0.2;
        const stake = 10;
        // Profit is usually around 90% of stake for Volatility Indices
        const profit = isWin ? +(stake * 0.95).toFixed(2) : -stake;

        currentBalance += profit;
        totalPnL += profit;

        // Advance time by 1-3 minutes
        startTime.setMinutes(startTime.getMinutes() + Math.floor(Math.random() * 3) + 1);

        trades.push({
            strategy: STRATEGY_NAME,
            symbol: 'R_100',
            contract_type: Math.random() > 0.5 ? 'CALL' : 'PUT',
            stake: stake,
            profit: profit,
            status: isWin ? 'won' : 'lost',
            balance: +currentBalance.toFixed(2),
            total_pnl: +totalPnL.toFixed(2),
            duration: 5,
            duration_unit: 't',
            timestamp: new Date(startTime),
        });
    }

    await Trade.insertMany(trades);
    console.log(`Successfully added ${count} trades. Final Balance: $${currentBalance.toFixed(2)}`);
}

async function removeFakeResults() {
    console.log(`Removing trades with strategy: ${STRATEGY_NAME}...`);
    const result = await Trade.deleteMany({ strategy: STRATEGY_NAME });
    console.log(`Deleted ${result.deletedCount} fake trades.`);
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
        await connect();

        if (command === 'add') {
            await addFakeResults();
        } else if (command === 'clean') {
            await removeFakeResults();
        } else {
            console.log('Usage: node results_faker.js <add|clean>');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
        process.exit(0);
    }
}

main();
