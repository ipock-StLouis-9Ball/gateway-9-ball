const mongoose = require('mongoose');


const AccountSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: {
        type: String,
        enum: ['user', 'escrow', 'platform_revenue'],
        required: true
    },
    userId: { type: String, unique: true, sparse: true }, // For 'user' accounts
    matchId: { type: String, unique: true, sparse: true }, // For 'escrow' accounts
    practiceMatchesCompleted: { type: Number, default: 0 },
    skillRating: { type: Number, default: 1000 },
    currency: { type: String, default: 'USD' },
    createdAt: { type: Date, default: Date.now }
});


const TransactionSchema = new mongoose.Schema({
    fromAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    toAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    type: {
        type: String,
        enum: ['deposit', 'buy_in', 'payout', 'platform_fee', 'withdrawal'],
        required: true
    },
    metadata: {
        matchId: String,
        withdrawalId: String,
        note: String
    },
    timestamp: { type: Date, default: Date.now }
});


// Indexes for high-performance balance calculation
TransactionSchema.index({ fromAccountId: 1 });
TransactionSchema.index({ toAccountId: 1 });


const Account = mongoose.model('Account', AccountSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);


module.exports = { Account, Transaction };
