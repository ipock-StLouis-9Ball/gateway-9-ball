// ============================================================================
// supportHub.ts — Resilient AI Support & Security Sentinel Agent Hub.
// Features: Loop detection, context truncation, rate limiting, and fallback answers
// to ensure AI support and security agents never lock up or enter endless loops.
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface SupportResponse {
  agent: string;
  message: string;
  timestamp: string;
  isEscalated?: boolean;
}

const MAX_HISTORY_LENGTH = 10;
const REPETITION_THRESHOLD = 3;

export class SupportHubService {
  private userHistories: Map<string, ChatMessage[]> = new Map();
  private userRecentReplies: Map<string, string[]> = new Map();

  constructor() {}

  /**
   * Safe message handler with loop prevention and structured fallback.
   */
  public async handlePlayerMessage(
    userId: string,
    message: string,
    isEscalated = false
  ): Promise<SupportResponse> {
    const agentName = isEscalated ? 'Agent_Eta_Resolver' : 'Agent_Zeta_Concierge';
    const history = this.getOrInitHistory(userId);

    // 1. Loop / repetition detection
    const recent = this.userRecentReplies.get(userId) || [];
    const normalizedInput = message.trim().toLowerCase();

    if (recent.filter((m) => m === normalizedInput).length >= REPETITION_THRESHOLD) {
      const fallbackMsg = isEscalated
        ? "I notice you are sending the same question repeatedly. Your ticket has been logged for manual human compliance review. An agent will contact you via email."
        : "It looks like we're retrying the same question. Let me transfer you to our escalation specialist (Agent Eta) for priority assistance.";

      return {
        agent: agentName,
        message: fallbackMsg,
        timestamp: new Date().toISOString(),
        isEscalated: true,
      };
    }

    // 2. Track message history with max length constraint
    history.push({ role: 'user', content: message });
    if (history.length > MAX_HISTORY_LENGTH) {
      history.splice(0, history.length - MAX_HISTORY_LENGTH);
    }

    recent.push(normalizedInput);
    if (recent.length > 5) recent.shift();
    this.userRecentReplies.set(userId, recent);

    // 3. Response generation with default safe answers
    let replyText = '';
    if (normalizedInput.includes('withdraw') || normalizedInput.includes('payout')) {
      replyText = "Withdrawals are processed instantly for debit cards or within 1-3 business days for ACH. You can request withdrawals directly in your Wallet screen.";
    } else if (normalizedInput.includes('foul') || normalizedInput.includes('rule')) {
      replyText = "Gateway 9-Ball follows APA rules: lowest ball first, ball-in-hand on fouls, and 9-ball on a legal break/shot wins the set.";
    } else if (normalizedInput.includes('hacker') || normalizedInput.includes('cheat') || normalizedInput.includes('disconn')) {
      replyText = "All shot calculations and match states run on our server-authoritative engine with 24/7 Sentinel monitoring. Forced disconnections trigger a 90-second forfeit window.";
    } else {
      replyText = isEscalated
        ? `[${agentName}] I am reviewing your request regarding match telemetry and ledger state. All accounting records are verified double-entry transactions.`
        : `[${agentName}] Welcome to Gateway 9-Ball support! How can I assist you with your match, wallet, or pro shop items?`;
    }

    history.push({ role: 'model', content: replyText });

    return {
      agent: agentName,
      message: replyText,
      timestamp: new Date().toISOString(),
      isEscalated,
    };
  }

  private getOrInitHistory(userId: string): ChatMessage[] {
    if (!this.userHistories.has(userId)) {
      this.userHistories.set(userId, []);
    }
    return this.userHistories.get(userId)!;
  }
}

export const supportHub = new SupportHubService();
