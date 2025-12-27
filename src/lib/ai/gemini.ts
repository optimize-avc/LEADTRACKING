import { GoogleGenerativeAI } from "@google/generative-ai";

export const GeminiService = {
    async generateText(prompt: string): Promise<string> {
        try {
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    modelName: "gemini-2.5-flash"
                })
            });

            if (!response.ok) {
                const err = await response.json();
                console.error("AI API Error:", err);
                return "Error: " + (err.error || "Failed to generate");
            }

            const data = await response.json();
            return data.text;
        } catch (error) {
            console.error("Gemini Service Error:", error);
            return "Error calling AI service.";
        }
    },

    async generatePersona(role: string, industry: string): Promise<any> {
        const prompt = `
            Generate a detailed sales prospect persona for a ${role} in the ${industry} industry.
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
        const text = await this.generateText(prompt);
        try {
            // Clean up markdown if Gemini wraps in ```json ... ```
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        } catch (e) {
            console.error("Failed to parse persona JSON", e);
            console.error("Raw text was:", text);
            return null;
        }
    },

    async generateReply(persona: any, history: { role: string, content: string }[], userMessage: string): Promise<string> {
        const systemPrompt = `
            You are acting as ${persona.name}, a ${persona.role} at ${persona.company}.
            Your personality is: ${persona.personality}.
            Your pain points are: ${persona.painPoints.join(', ')}.
            Your hidden agenda is: ${persona.hiddenAgenda}.
            
            The user is a salesperson trying to sell you software.
            Respond to their latest message naturally. Stay in character.
            Be resistant but open if they address your pain points well.
            Keep responses concise (under 50 words) like a real chat.
        `;

        // simplified history construction
        const conversation = history.map(h => `${h.role === 'user' ? 'Salesperson' : 'You'}: ${h.content}`).join('\n');

        const fullPrompt = `
            ${systemPrompt}
            
            Conversation History:
            ${conversation}
            
            Salesperson: ${userMessage}
            You:
        `;

        return await this.generateText(fullPrompt);
    },

    async analyzePitch(transcript: string): Promise<any> {
        const prompt = `
            Analyze this sales pitch transcript: "${transcript}"
            
            Return ONLY a JSON object with this structure:
            {
                "score": 85, // 0-100 based on clarity, persuasion, and confidence
                "pace": 130, // Estimated words per minute (just estimate relative to text length if no time data, or assume average speaking speed)
                "fillerWords": ["um", "like"], // List detected filler words
                "confidence": "High", // High, Medium, Low
                "strengths": ["Strength 1", "Strength 2"], // 3 key strengths
                "improvements": ["Tip 1", "Tip 2"], // 3 specific improvements
                "oneLineFeedback": "Excellent delivery but watch the 'ums'."
            }
        `;
        const text = await this.generateText(prompt);
        try {
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        } catch (e) {
            console.error("Failed to parse pitch analysis", e);
            return null;
        }
    },

    async generateDealScenario(level: string, context?: { company: string, industry: string, value: string }): Promise<any> {
        let contextPrompt = "";
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
        const text = await this.generateText(prompt);
        try {
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        } catch (e) {
            console.error("Failed to parse deal scenario", e);
            return null;
        }
    },

    async evaluateTurn(gameState: any, action: string, targetId: string): Promise<any> {
        const prompt = `
            You are the Dungeon Master for a B2B Sales Wargame.
            
            Current Scenario:
            Company: ${gameState.company}
            Target Stakeholder: ${gameState.stakeholders.find((s: any) => s.id === targetId)?.name} (${gameState.stakeholders.find((s: any) => s.id === targetId)?.role})
            Stakeholder Traits: ${gameState.stakeholders.find((s: any) => s.id === targetId)?.traits.join(', ')}
            Current Sentiment: ${gameState.stakeholders.find((s: any) => s.id === targetId)?.sentiment}/100
            
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
        const text = await this.generateText(prompt);
        try {
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        } catch (e) {
            console.error("Failed to parse turn evaluation", e);
            return null;
        }
    }
};
