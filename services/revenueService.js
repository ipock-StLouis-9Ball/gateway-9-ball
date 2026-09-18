const { Transaction, Account } = require('../models/Ledger');
const mongoose = require('mongoose');


class RevenueService {
    /**
     * Calculates overall platform stats using the Transaction Ledger.
     */
    async getOverallStats() {
        const platformAccount = await Account.findOne({ type: 'platform_revenue' });
        if (!platformAccount) return { error: "Platform account not initialized" };


        // Total Platform Revenue (sum of all platform_fee transfers)
        const revenue = await Transaction.aggregate([
            { $match: { toAccountId: platformAccount._id, type: 'platform_fee' } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);


        // Total Wagering Volume (sum of all buy_in transfers / 2, since each match has 2 buy-ins)
        const volume = await Transaction.aggregate([
            { $match: { type: 'buy_in' } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);


        // Total Match Count
        const matchCount = await Transaction.distinct('metadata.matchId', { type: 'buy_in' });


        return {
            matchCount: matchCount.length,
            totalVolume: volume.length > 0 ? volume[0].total.toFixed(2) : "0.00",
            totalPlatformRevenue: revenue.length > 0 ? revenue[0].total.toFixed(2) : "0.00",
            averageWager: matchCount.length > 0 ? (volume[0].total / (matchCount.length * 2)).toFixed(2) : "0.00"
        };
    }


    async getPlayerHistory(userId) {
        const account = await Account.findOne({ userId, type: 'user' });
        if (!account) return [];


        const history = await Transaction.find({
            $or: [{ fromAccountId: account._id }, { toAccountId: account._id }]
        }).sort({ timestamp: -1 });


        return history.map(tx => ({
            id: tx._id,
            timestamp: tx.timestamp,
            type: tx.type,
            amount: tx.fromAccountId.equals(account._id) ? -tx.amount : tx.amount,
            matchId: tx.metadata.matchId,
            note: tx.metadata.note
        }));
    }
}


module.exports = new RevenueService();
