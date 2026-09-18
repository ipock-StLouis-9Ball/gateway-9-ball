const matchConfig = require('../config/match_settings.json');
const matchLogger = require('./matchLogger');
const ledgerService = require('./ledgerService');
const amlService = require('./amlService');
const bankingAgent = require('./bankingAgent');


class WithdrawalService {
    constructor() {
        this.tiers = matchConfig.withdrawal_fees.tiers;
        this.methods = matchConfig.withdrawal_fees.methods;
    }


    calculateNetPayout(amount, method) {
        // ... (unchanged calculateNetPayout logic)
        const tier = this.tiers.find(t =>
            amount >= t.min && (t.max === null || amount <= t.max)
        );


        if (!tier) return { error: "Invalid withdrawal amount" };


        const baseFeeAmount = amount * (tier.fee_percentage / 100);

        const methodConfig = this.methods[method];
        if (!methodConfig) return { error: "Invalid withdrawal method" };


        let methodFeeAmount = 0;
        if (methodConfig.extra_fee_percentage) {
            methodFeeAmount = amount * (methodConfig.extra_fee_percentage / 100);
        } else if (methodConfig.extra_fee_amount !== undefined) {
            methodFeeAmount = methodConfig.extra_fee_amount;
        } else if (methodConfig.extra_fee_fixed !== undefined) {
            methodFeeAmount = methodConfig.extra_fee_fixed;
        }


        const totalFeeAmount = baseFeeAmount + methodFeeAmount;
        const netPayout = amount - totalFeeAmount;


        return {
            requestedAmount: amount,
            method: methodConfig.label,
            processingTime: methodConfig.processing_time,
            baseFeePercentage: tier.fee_percentage,
            baseFeeAmount: parseFloat(baseFeeAmount.toFixed(2)),
            methodFeeAmount: parseFloat(methodFeeAmount.toFixed(2)),
            totalFeeAmount: parseFloat(totalFeeAmount.toFixed(2)),
            netPayout: parseFloat(netPayout.toFixed(2))
        };
    }


    async processWithdrawal(userId, amount, method, destination) {
        const result = this.calculateNetPayout(amount, method);
        if (result.error) return result;


        try {
            // --- AML COMPLIANCE CHECK: Transaction Monitoring ---
            const currentTx = { id: `WDL_${Date.now()}`, type: 'withdrawal', amount, method, destination };
            // In production, fetch historical txs from ledgerService
            const amlAnalysis = await amlService.monitorTransaction(userId, currentTx, []);

            if (amlAnalysis.isSuspicious && amlAnalysis.riskLevel === 'Critical') {
                return { error: "Transaction flagged for AML review. Funds temporarily frozen." };
            }


            // --- BANKING AUDIT: Agent Epsilon ---
            const bankingAudit = await bankingAgent.auditWithdrawal(userId, amount, { method, destination, ...result });
            if (!bankingAudit.auditPassed) {
                return { error: `Withdrawal Denied by Banking Audit: ${bankingAudit.reasoning}` };
            }


            // ... (proceed with accounting)
            const userAccount = await ledgerService.getOrCreateUserAccount(userId, 'User');
            const systemAccount = await ledgerService.getSystemCofferAccount();
            const platformRevenueAccount = await ledgerService.getPlatformRevenueAccount();


            const balance = await ledgerService.getBalance(userAccount._id);
            if (balance < amount) {
                return { error: "Insufficient funds for withdrawal" };
            }


            const withdrawalId = currentTx.id;


            // Double-Entry Workflow:
            // 1. Debit User Account, Credit System Coffer (The cash-out movement)
            await ledgerService.transfer(userAccount._id, systemAccount._id, amount, 'withdrawal', { withdrawalId });

            // 2. Platform collects the fees (System Coffer -> Platform Revenue)
            if (result.totalFeeAmount > 0) {
                await ledgerService.transfer(systemAccount._id, platformRevenueAccount._id, result.totalFeeAmount, 'platform_fee', { withdrawalId, note: 'Withdrawal Fee' });
            }


            // Log the withdrawal event for legal audit
            await matchLogger.logEvent('WITHDRAWAL', {
                transactionId: withdrawalId,
                userId,
                amount,
                method: result.method,
                totalFee: result.totalFeeAmount,
                net: result.netPayout,
                destination,
                processingTime: result.processingTime,
                timestamp: new Date().toISOString()
            });


            return {
                status: 'success',
                transactionId: withdrawalId,
                ...result
            };
        } catch (err) {
            console.error('Withdrawal Accounting Error:', err);
            return { error: "Internal Accounting Error" };
        }
    }
}


module.exports = new WithdrawalService();
