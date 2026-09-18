const { VertexAI } = require('@google-cloud/vertexai');
const ledgerService = require('./ledgerService');
const matchLogger = require('./matchLogger');


class BankingAgent {
    constructor(projectId = 'nine-ball-tournament', location = 'us-central1') {
        this.vertexAI = new VertexAI({ project: projectId, location: location });

        this.epsilon = {
            name: "Agent_Epsilon_TheBanker",
            personality: "A cold, precise, and ruthless accountant. Cares only about double-entry math matching perfectly. Trusts nothing but the ledger.",
            model: 'gemini-1.5-pro'
        };
    }


    /**
     * Called before any actual money leaves the platform (Withdrawals)
     */
    async auditWithdrawal(userId, amount, withdrawalDetails) {
        console.log(`🏦 [AGENT EPSILON] Conducting pre-withdrawal audit for User ${userId}...`);

        // 1. Gather all financial evidence for this user
        const userAccount = await ledgerService.getOrCreateUserAccount(userId, 'User');
        const currentLedgerBalance = await ledgerService.getBalance(userAccount._id);
        const transactionHistory = await this.fetchRecentTransactions(userAccount._id);

        const generativeModel = this.vertexAI.getGenerativeModel({ model: this.epsilon.model });

        const prompt = `
            SYSTEM: You are ${this.epsilon.name}. Personality: ${this.epsilon.personality}.
            TASK: Audit this withdrawal request before authorizing the transfer of physical funds.

            REQUEST: User ${userId} wants to withdraw $${amount}.
            LEDGER_BALANCE_CALCULATED: $${currentLedgerBalance}
            WITHDRAWAL_DETAILS: ${JSON.stringify(withdrawalDetails)}
            RECENT_LEDGER_HISTORY: ${JSON.stringify(transactionHistory)}

            Rule 1: If requested amount > ledger balance, DENY.
            Rule 2: If the math in the ledger history doesn't logically sum up to the balance, DENY and flag for review.
            Rule 3: You are the final authority on math.

            Return ONLY a valid JSON object:
            {
                "auditPassed": boolean,
                "reasoning": "string (Why it passed or failed)"
            }
        `;


        try {
            const response = await generativeModel.generateContent(prompt);
            const auditResult = JSON.parse(response.response.candidates[0].content.parts[0].text.replace(/```json|```/g, ''));

            if (!auditResult.auditPassed) {
                console.error(`🛑 [AGENT EPSILON] AUDIT FAILED: ${auditResult.reasoning}`);
                // Escalate to owner immediately
                await matchLogger.logEvent('EPSILON_AUDIT_FAILURE', { userId, amount, reasoning: auditResult.reasoning });
            } else {
                console.log(`✅ [AGENT EPSILON] Audit Passed. Funds verified.`);
            }


            return auditResult;
        } catch (e) {
            console.error(`[Banker AI Error]`, e);
            return { auditPassed: false, reasoning: "Banking Agent offline. Failing closed." };
        }
    }


    // Helper for the AI prompt
    async fetchRecentTransactions(accountId) {
        const { Transaction } = require('../models/Ledger');
        return await Transaction.find({
            $or: [{ fromAccountId: accountId }, { toAccountId: accountId }]
        }).sort({ timestamp: -1 }).limit(20).lean();
    }
}


module.exports = new BankingAgent();
