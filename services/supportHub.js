const { VertexAI } = require('@google-cloud/vertexai');
const fs = require('fs');
const path = require('path');


class SupportHub {
    constructor(projectId = 'nine-ball-tournament', location = 'us-central1') {
        this.vertexAI = new VertexAI({ project: projectId, location: location });
        this.chatLogsDir = path.join(__dirname, '../logs/support_chats');
        if (!fs.existsSync(this.chatLogsDir)) fs.mkdirSync(this.chatLogsDir, { recursive: true });


        this.agents = {
            zeta: {
                name: "Agent_Zeta_Concierge",
                personality: "Exceedingly friendly, helpful, and welcoming. Expert in game rules, account setup, and store items. The first point of contact for players.",
                model: 'gemini-1.5-flash'
            },
            eta: {
                name: "Agent_Eta_Resolver",
                personality: "Professional, analytical, and firm. Specialized in resolving match disputes, transaction failures, and compliance questions. Stepped in when issues are escalated.",
                model: 'gemini-1.5-pro'
            }
        };
    }


    async handlePlayerMessage(userId, message, history = [], isEscalated = false) {
        const agentKey = isEscalated ? 'eta' : 'zeta';
        const agent = this.agents[agentKey];
        const model = this.vertexAI.getGenerativeModel({ model: agent.model });


        const prompt = `
            SYSTEM: You are ${agent.name}. Personality: ${agent.personality}.
            CONTEXT: You are a customer support representative for the "Game of the Century" 9-Ball Tournament platform.
            PLAYER_ID: ${userId}

            CONVERSATION_HISTORY:
            ${JSON.stringify(history)}

            PLAYER_MESSAGE: "${message}"

            Respond as the agent. If the player is angry or the issue is a financial dispute, maintain your ${agent.name} persona.
        `;


        try {
            const response = await model.generateContent(prompt);
            const reply = response.response.candidates[0].content.parts[0].text;

            // Log the chat
            this.logChatMessage(userId, agent.name, message, reply);

            return {
                agent: agent.name,
                message: reply,
                timestamp: new Date().toISOString()
            };
        } catch (e) {
            console.error(`Support Agent ${agent.name} Error:`, e);
            return { message: "I'm experiencing a technical hiccup. Please try again in a moment." };
        }
    }


    logChatMessage(userId, agentName, playerMsg, agentReply) {
        const logPath = path.join(this.chatLogsDir, `user_${userId}.json`);
        let logs = [];
        if (fs.existsSync(logPath)) {
            logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
        }
        logs.push({
            timestamp: new Date().toISOString(),
            player: playerMsg,
            [agentName]: agentReply
        });
        fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
    }
}


module.exports = new SupportHub();
