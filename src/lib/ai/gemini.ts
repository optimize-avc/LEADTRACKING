import {
    AIPersona,
    AIPitchAnalysis,
    AIScenario,
    AITurnResult,
    AIBoardroomTurnResult,
    AIBoardroomScenario,
    AIFutureArtifact,
    AIStakeholder,
    AIBoardroomAgent,
    AIBoardroomTranscriptItem,
} from '@/types/ai';

export const GeminiService = {
    async generateText(prompt: string, token?: string): Promise<string> {
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token} `;
            }

            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    prompt,
                    modelName: 'gemini-2.5-flash',
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                console.error('AI API Error:', err);
                return 'Error: ' + (err.error || 'Failed to generate');
            }

            const data = await response.json();
            return data.text;
        } catch (error) {
            console.error('Gemini Service Error:', error);
            return 'Error calling AI service.';
        }
    },

    async generatePersona(
        role: string,
        industry: string,
        contextMaterials?: string,
        token?: string
    ): Promise<AIPersona | null> {
        let contextPrompt = '';
        if (contextMaterials) {
            contextPrompt = `
                CONTEXT MATERIALS(PRODUCT / ENABLEMENT):
                ${contextMaterials.substring(0, 30000)}

INSTRUCTION: The user is selling the product described above.
                The persona should be a likely buyer(or blocker) for THIS specific product.
    Their "pain points" should be problems this product solves.
        Their "objections" should be specific weaknesses or common doubts about this type of product.
            `;
        }

        const prompt = `
            Generate a detailed sales prospect persona for a ${role} in the ${industry} industry.
    ${contextPrompt}

            Return ONLY a JSON object with this structure:
{
    "name": "Full Name",
        "role": "${role}",
            "company": "Company Name",
                "personality": "Brief description of their communication style (e.g., direct, skeptical, friendly)",
                    "painPoints": ["Point 1", "Point 2"],
                        "objections": ["Objection 1", "Objection 2"],
                            "hiddenAgenda": "A secret motivation they won't say outright"
}
`;
        const text = await this.generateText(prompt, token);
        if (!text || text.startsWith('Error')) return null;
        try {
            // Clean up markdown if Gemini wraps in \`\`\`json ... \`\`\`
            const cleanText = text
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();
            return JSON.parse(cleanText);
        } catch (e) {
            console.error('Gemini Parse Error', e);
            return null;
        }
    },

    async generateReply(
        persona: AIPersona,
        history: { role: string; content: string }[],
        userMessage: string,
        contextMaterials?: string,
        token?: string
    ): Promise<string> {
        let contextPrompt = '';
        if (contextMaterials) {
            contextPrompt = `
                PRODUCT CONTEXT:
                ${contextMaterials.substring(0, 30000)}
                
                INSTRUCTION: You are skeptical about THIS product. Use the context to ask specific hard questions.
             `;
        }

        const systemPrompt = `
            You are acting as ${persona.name}, a ${persona.role} at ${persona.company}.
            Your personality is: ${persona.personality}.
            Your pain points are: ${persona.painPoints.join(', ')}.
            Your hidden agenda is: ${persona.hiddenAgenda}.
            
            ${contextPrompt}

            The user is a salesperson trying to sell you software.
            Respond to their latest message naturally. Stay in character.
            Be resistant but open if they address your pain points well.
            Keep responses concise (under 50 words) like a real chat.
        `;

        // simplified history construction
        const conversation = history
            .map((h) => `${h.role === 'user' ? 'Salesperson' : 'You'}: ${h.content}`)
            .join('\n');

        const fullPrompt = `
            ${systemPrompt}
            
            Conversation History:
            ${conversation}
            
            Salesperson: ${userMessage}
            You:
        `;

        return await this.generateText(fullPrompt, token);
    },

    async analyzePitch(transcript: string, token?: string): Promise<AIPitchAnalysis | null> {
        const prompt = `
            Analyze this sales pitch transcript: "${transcript}"
            
            Return ONLY a JSON object with this structure:
            {
                "score": 85, // 0-100 based on clarity, persuasion, and confidence
                "pace": 130, // Estimated words per minute 
                "fillerWords": ["um", "like"], // List detected filler words
                "confidence": "High", // High, Medium, Low
                "strengths": ["Strength 1", "Strength 2"], // 3 key strengths
                "improvements": ["Tip 1", "Tip 2"], // 3 specific improvements
                "oneLineFeedback": "Excellent delivery but watch the 'ums'."
            }
        `;
        const text = await this.generateText(prompt, token);
        if (!text || text.startsWith('Error')) return null;
        try {
            const cleanText = text
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();
            const data = JSON.parse(cleanText);
            // Fallback for legacy format or AI inconsistencies
            if (data.feedback && !data.oneLineFeedback) {
                data.oneLineFeedback = data.feedback;
            }
            return data as AIPitchAnalysis;
        } catch (e) {
            console.error('Failed to parse pitch analysis', e);
            return null;
        }
    },

    async generateDealScenario(
        level: string,
        context?: {
            company: string;
            industry: string;
            value: string;
            stage?: string;
            contact?: string;
        },
        contextMaterials?: string,
        token?: string
    ): Promise<AIScenario | null> {
        let contextPrompt = '';
        if (context) {
            contextPrompt = `
                CONTEXT: The user wants to simulate a deal with a REAL company.
                Real Company Name: "${context.company}"
                Real Industry: "${context.industry}"
                Real Deal Value: "${context.value}"
                
                INSTRUCTION: Use the above Real Company Name and Industry. Generate a FICTIONALIZED high-stakes scenario involving them.
                Create realistic stakeholders that might exist at this specific company/industry.
            `;
        }

        if (contextMaterials) {
            contextPrompt += `
                
                ADDITIONAL CONTEXT MATERIALS (PRODUCT/ENABLEMENT):
                ${contextMaterials.substring(0, 50000)} 
                
                INSTRUCTION: The user is selling the product described above. 
                Ensure the stakeholders have objections SPECIFIC to this product/solution.
                Ensure their hidden agendas or business needs align with what this product solves (or fails to solve).
            `;
        }

        const prompt = `
            Generate a high-stakes B2B sales deal scenario (Level: ${level}).
            ${contextPrompt}
            
            Return ONLY a JSON object with this structure:
            {
                "company": "Company Name", // Use the real one if provided
                "industry": "Industry Type",
                "dealValue": "$150,000", // Use the real one if provided
                "difficulty": "Hard",
                "description": "Brief context about why they are buying.",
                "stakeholders": [
                    {
                        "id": "s1",
                        "name": "Full Name",
                        "role": "Job Title",
                        "dominance": "High", // High/Med/Low (influence on deal)
                        "sentiment": 40, // 0-100 (starting support)
                        "hiddenAgenda": "Secret motivation (e.g. wants a promotion)",
                        "traits": ["Skeptical", "Analytical"] // 2-3 personality keywords
                    }
                    // Generate 3 unique stakeholders total
                ]
            }
        `;
        const text = await this.generateText(prompt, token);
        if (!text || text.startsWith('Error')) return null;
        try {
            const cleanText = text
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();
            return JSON.parse(cleanText);
        } catch (e) {
            console.error('Failed to parse deal scenario', e);
            return null;
        }
    },

    async evaluateTurn(
        gameState: { company: string; stakeholders: AIStakeholder[] },
        action: string,
        targetId: string,
        token?: string
    ): Promise<AITurnResult | null> {
        const prompt = `
            You are the Dungeon Master for a B2B Sales Wargame.
            
            Current Scenario:
            Company: ${gameState.company}
            Target Stakeholder: ${gameState.stakeholders.find((s: AIStakeholder) => s.id === targetId)?.name} (${gameState.stakeholders.find((s: AIStakeholder) => s.id === targetId)?.role})
            Stakeholder Traits: ${gameState.stakeholders.find((s: AIStakeholder) => s.id === targetId)?.traits.join(', ')}
            Current Sentiment: ${gameState.stakeholders.find((s: AIStakeholder) => s.id === targetId)?.sentiment}/100
            
            Player Action: "${action}"

            Simulate the stakeholder's reaction based on their traits and hidden agenda.
            
            Return ONLY a JSON object:
            {
                "outcomeTitle": "Brief Title (e.g. 'Meeting Accepted' or 'Ghosted')",
                "outcomeDescription": "Narrative description of what happened.",
                "sentimentDelta": 15, // Change in sentiment (-100 to +100)
                "dealHealthDelta": 5, // Impact on overall deal health
                "newRisk": "New risk factor revealed (optional)",
                "emailResponse": {
                    "from": "Stakeholder Name",
                    "subject": "Re: ${action}",
                    "body": "The text of their email reply."
                }
            }
        `;
        const text = await this.generateText(prompt, token);
        if (!text || text.startsWith('Error')) return null;
        try {
            const cleanText = text
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();
            return JSON.parse(cleanText);
        } catch (e) {
            console.error('Failed to parse turn evaluation', e);
            return null;
        }
    },

    async evaluateBoardroomTurn(
        agents: AIBoardroomAgent[],
        userMessage: string,
        history: AIBoardroomTranscriptItem[],
        token?: string
    ): Promise<AIBoardroomTurnResult | null> {
        const historyText = history.map((h) => `${h.speaker}: ${h.message}`).join('\n');
        const agentProfiles = agents
            .map((a) => `${a.name} (${a.role}, ${a.archetype}): ${a.hiddenAgenda}`)
            .join('\n');

        const prompt = `
            BOARDROOM SIMULATION
            
            AGENTS:
            ${agentProfiles}

            HISTORY:
            ${historyText}

            USER MESSAGE: "${userMessage}"

            INSTRUCTION:
            1. Decisions: Who speaks next? (Main Speaker).
            2. Whispers: What are they THINKING but not saying? (Generate for 1-2 agents).
            3. Sidebar: Do any agents whisper to each other? (Optional).

            Return ONLY a JSON object:
            {
                "mainSpeakerId": "s1", // ID of the agent responding publicly
                "response": "The spoken response to the user.",
                "whispers": [
                    { "agentId": "s2", "thought": "He's dodging the budget question." }
                ],
                "sidebar": { // Optional
                    "fromId": "s1", "toId": "s3", "message": "Let's press him on security."
                }
            }
        `;
        const text = await this.generateText(prompt, token);
        if (!text || text.startsWith('Error')) return null;
        try {
            const cleanText = text
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();
            return JSON.parse(cleanText);
        } catch (e) {
            console.error('Failed to evaluate boardroom turn', e);
            return null;
        }
    },

    async generateBoardroomScenario(token?: string): Promise<AIBoardroomScenario | null> {
        const prompt = `
            Generate a 3-agent B2B buying committee for a "Boardroom" simulation.
            They must have CONFLICTING goals.
            
            Roles needed:
            1. The Blocker (e.g. CFO, Legal) - Skeptical, budget-conscious.
            2. The Champion (e.g. Head of Sales, VP) - Enthusiastic but needs help.
            3. The Decision Maker (e.g. CEO, CTO) - Neutral, looking for ROI.

            Return ONLY a JSON object:
            {
                "company": "TechCorp Inc.",
                "stakeholders": [
                    {
                        "id": "s1", "name": "Marcus Grip", "role": "CFO", "archetype": "Blocker",
                        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
                        "dominance": 90, "patience": 30, "hiddenAgenda": "Wants to cut budget by 20%."
                    },
                    {
                        "id": "s2", "name": "Sarah Chen", "role": "VP of Sales", "archetype": "Champion",
                        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
                        "dominance": 60, "patience": 80, "hiddenAgenda": "Needs a win to get promoted."
                    },
                    {
                        "id": "s3", "name": "David Okonjo", "role": "CTO", "archetype": "Neutral",
                        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
                        "dominance": 80, "patience": 60, "hiddenAgenda": "Cares only about security compliance."
                    }
                ]
            }
        `;
        const text = await this.generateText(prompt, token);
        if (!text || text.startsWith('Error')) return null;
        try {
            const cleanText = text
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();
            return JSON.parse(cleanText);
        } catch (e) {
            console.error('Failed to generate boardroom', e);
            return null;
        }
    },

    async generateFutureArtifact(
        transcriptHistory: AIBoardroomTranscriptItem[],
        outcome: 'win' | 'loss',
        token?: string
    ): Promise<AIFutureArtifact | null> {
        const historyText = transcriptHistory.map((t) => `${t.speaker}: ${t.message}`).join('\n');

        const prompt = `
            TRANSCRIPT OF SALES CALL:
            ${historyText}
            
            OUTCOME: ${outcome.toUpperCase()}
            
            INSTRUCTION:
            The simulation is over. "Flash Forward" 6 months into the future to show the CONSEQUENCES of this deal.
            
            If WIN:
            - Generate a POSITIVE future (e.g. Stock rise, CEO praise, Partnership announcement).
            - Format: 'news_article'
            
            If LOSS:
            - Analyze WHY they lost (e.g. ignored objection, rude, too expensive).
            - Generate a NEGATIVE future (e.g. Competitor installed -> Disaster, Leaked Email of regret, Slack gossip about bad pitch).
            - Format: 'leaked_email' OR 'slack_chat' OR 'stock_crash' (choose most appropriate).
            
            Return ONLY a JSON object matching one of these schemas:
            
            OPTION 1: News Article (Great Success or Public Fail)
            {
                "type": "news_article",
                "headline": "Acme Corp Shares Surge 15% After Partnership",
                "publication": "TechCrunch",
                "date": "October 12, 2026",
                "body": "The strategic alignment has proven transformative...",
                "imageUrl": "https://api.dicebear.com/7.x/identicon/svg?seed=Acme" 
            }
            
            OPTION 2: Leaked Email (Regret or Internal Chaos)
            {
                "type": "email",
                "subject": "FW: URGENT: The new system is down again",
                "from": "CEO <ceo@company.com>",
                "to": "CTO <cto@company.com>",
                "date": "2 Days Ago",
                "body": "I told you we should have gone with [User's Solution]. This cheap vendor is costing us millions. Fix it or you're fired."
            }
            
            OPTION 3: Slack Chat (Embarrassment or Gossip)
            {
                "type": "slack",
                "channel": "#sales-gossip",
                "messages": [
                    { "user": "Sarah", "text": "Did you see that pitch today? Yikes." },
                    { "user": "Mike", "text": "Total used car salesman vibes. I muted him halfway through." }
                ]
            }
            
            OPTION 4: Stock Ticker (Catastrophe)
            {
                "type": "stock",
                "ticker": "ACME",
                "price": "42.15",
                "change": "-12.5%",
                "news": "Data Breach Confirmed: Analysts cite lack of security vendor."
            }
        `;

        const text = await this.generateText(prompt, token);
        if (!text || text.startsWith('Error')) return null;
        try {
            const cleanText = text
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();
            return JSON.parse(cleanText);
        } catch (e) {
            console.error('Failed to generate time machine artifact', e);
            return null;
        }
    },
};
