const { VertexAI } = require('@google-cloud/vertexai');
const fs = require('fs');
const path = require('path');


class SecurityCouncil {
    constructor(projectId, location = 'us-central1') {
        this.vertexAI = new VertexAI({ project: projectId, location: location });
        this.quarantineDir = path.join(__dirname, '../logs/quarantine');
        if (!fs.existsSync(this.quarantineDir)) fs.mkdirSync(this.quarantineDir, { recursive: true });

        this.agents = {
            alpha: {
                name: "Agent_Alpha_Analyst",
                personality: "Extremely technical, obsessive about code integrity and memory safety. Expert in JavaScript/C++ security.",
                model: 'gemini-1.5-pro'
            },
            beta: {
                name: "Agent_Beta_Skeptic",
                personality: "Cynical, focuses on user behavior and potential false positives (network lag, hardware glitches).",
                model: 'gemini-1.5-pro'
            },
            gamma: {
                name: "Agent_Gamma_Strategist",
                personality: "Business-oriented, focuses on escrow integrity and protecting the 10% house cut and tournament reputation.",
                model: 'gemini-1.5-pro'
            }
        };
    }


    async reviewIncident(incidentData, targetFilePath) {
        console.log(`🛡️ [COUNCIL] Investigating malfunction in: ${targetFilePath}`);
        const codeSnippet = fs.readFileSync(targetFilePath, 'utf8');


        // Parallel Verdict Generation
        const verdicts = await Promise.all(Object.keys(this.agents).map(key =>
            this.generateVerdict(key, incidentData, codeSnippet)
        ));


        const breachVotes = verdicts.filter(v => v.isBreach).length;
        const wasFixed = breachVotes >= 2;


        // MANDATORY OWNER NOTIFICATION: Informs of BOTH findings and repairs
        await this.ownerAlert(verdicts, targetFilePath, wasFixed);


        if (wasFixed) {
            await this.autonomousRemediation(verdicts, targetFilePath, codeSnippet);
        } else {
            console.log("✅ [CLEARED] Council determined no breach. Informational alert sent to owner.");
        }
    }


    async generateVerdict(agentKey, incident, code) {
        const agent = this.agents[agentKey];
        const model = this.vertexAI.getGenerativeModel({ model: agent.model });

        const prompt = `
            SYSTEM: You are ${agent.name}. Personality: ${agent.personality}.
            TASK: Review the following incident for a Real-Money 9-Ball Tournament.
            INCIDENT DATA: ${JSON.stringify(incident)}
            AFFECTED CODE: ${code}

            Return ONLY a valid JSON object:
            {
                "agentName": "${agent.name}",
                "isBreach": boolean,
                "reasoning": "Detailed technical explanation",
                "suggestedFix": "Corrected code snippet to patch the vulnerability"
            }
        `;


        try {
            const response = await model.generateContent(prompt);
            return JSON.parse(response.response.candidates[0].content.parts[0].text.replace(/```json|```/g, ''));
        } catch (e) {
            console.error(`Error getting verdict from ${agent.name}:`, e);
            return { agentName: agent.name, isBreach: false, reasoning: "Model timeout or error" };
        }
    }


    async autonomousRemediation(verdicts, filePath, originalCode) {
        console.log(`🛠️ [REMEDIATING] Securing platform...`);
        const timestamp = Date.now();
        const quarantinePath = path.join(this.quarantineDir, `${path.basename(filePath)}.${timestamp}.bak`);
        fs.writeFileSync(quarantinePath, originalCode);

        const patch = verdicts.find(v => v.isBreach && v.suggestedFix).suggestedFix;
        fs.writeFileSync(filePath, patch);
        console.log(`🔥 [PATCHED] Generative security fix applied. Original quarantined at: ${quarantinePath}`);
    }


    async ownerAlert(verdicts, filePath, wasFixed) {
        const timestamp = new Date().toLocaleString();
        const subject = wasFixed ? "🔥 SECURITY BREACH NEUTRALIZED" : "🛡️ SECURITY INVESTIGATION REPORT";

        const reportBody = verdicts.map(v =>
            `[${v.agentName}] Verdict: ${v.isBreach ? 'BREACH' : 'CLEAR'}\nReasoning: ${v.reasoning}`
        ).join('\n\n');


        const fullAlert = `
        -------------------------------------------
        ALERT TYPE: ${subject}
        TIME: ${timestamp}
        AFFECTED FILE: ${filePath}
        SYSTEM STATUS: ${wasFixed ? 'REPAIRED (AUTO-PATCHED)' : 'SECURE (CLEARED)'}
        -------------------------------------------

        COUNCIL ANALYSIS:
        ${reportBody}

        -------------------------------------------
        This is an automated alert from the Vertex AI Security Council.
        -------------------------------------------
        `;


        console.log(`📱 [EMERGENCY NOTIFICATION] Sending Text + Email to joshuaipock4@gmail.com...`);
        console.log(fullAlert);

        // Placeholder for Twilio/SendGrid integration
        // await smsClient.messages.create({ body: `${subject}: ${filePath} was reviewed. Check email for report.`, to: '+16365891966' });
    }
}


module.exports = SecurityCouncil;
