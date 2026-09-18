const { Account, Transaction } = require('../models/Ledger');
const mongoose = require('mongoose');


class LedgerService {
    /**
     * Executes an atomic transfer between two accounts.
     * Implements double-entry: Amount is debited from 'from' and credited to 'to'.
     */
    async transfer(fromAccountId, toAccountId, amount, type, metadata = {}) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const transaction = new Transaction({
                fromAccountId,
                toAccountId,
                amount,
                type,
                metadata
            });


            await transaction.save({ session });
            await session.commitTransaction();
            return transaction;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }


    /**
     * Calculates current balance by summing all inbound and outbound transactions.
     * Authority: The transaction log IS the balance.
     */
    async getBalance(accountId) {
        const inbound = await Transaction.aggregate([
            { $match: { toAccountId: new mongoose.Types.ObjectId(accountId) } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);


        const outbound = await Transaction.aggregate([
            { $match: { fromAccountId: new mongoose.Types.ObjectId(accountId) } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);


        const credits = inbound.length > 0 ? inbound[0].total : 0;
        const debits = outbound.length > 0 ? outbound[0].total : 0;


        return parseFloat((credits - debits).toFixed(2));
    }


    async getOrCreateUserAccount(userId, name) {
        let account = await Account.findOne({ userId, type: 'user' });
        if (!account) {
            account = await Account.create({ userId, name, type: 'user' });
        }
        return account;
    }


    async getOrCreateEscrowAccount(matchId) {
        let account = await Account.findOne({ matchId, type: 'escrow' });
        if (!account) {
            account = await Account.create({ name: `Escrow Match ${matchId}`, matchId, type: 'escrow' });
        }
        return account;
    }


    async getPlatformRevenueAccount() {
        let account = await Account.findOne({ type: 'platform_revenue' });
        if (!account) {
            account = await Account.create({ name: 'Platform Revenue', type: 'platform_revenue' });
        }
        return account;
    }


    async getSystemCofferAccount() {
        // The ultimate source of funds for deposits (e.g. Stripe/Bank)
        let account = await Account.findOne({ name: 'System Coffer' });
        if (!account) {
            account = await Account.create({ name: 'System Coffer', type: 'platform_revenue' });
        }
        return account;
    }


    async incrementPracticeMatch(userId) {
        return await Account.findOneAndUpdate(
            { userId, type: 'user' },
            { $inc: { practiceMatchesCompleted: 1 } },
            { new: true }
        );
    }


    async updateSkillRating(winnerId, loserId) {
        const winner = await Account.findOne({ userId: winnerId, type: 'user' });
        const loser = await Account.findOne({ userId: loserId, type: 'user' });


        if (!winner || !loser) return;


        const winnerRating = winner.skillRating || 1000;
        const loserRating = loser.skillRating || 1000;


        const expectedWin = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
        const expectedLoss = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));
        const K = 32;


        winner.skillRating = Math.round(winnerRating + K * (1 - expectedWin));
        loser.skillRating = Math.round(loserRating + K * (0 - expectedLoss));


        await winner.save();
        await loser.save();
    }
}


module.exports = new LedgerService();
