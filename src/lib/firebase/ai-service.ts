import { app } from './config';
import { getAI, getGenerativeModel, VertexAIBackend, AI, GenerativeModel } from 'firebase/ai';
import { Lead, Resource } from '@/types';
import { MOCK_RESOURCES } from '@/lib/mock-data/resources';

// Initialize Firebase AI with Vertex AI backend (Gemini)
// Note: User has Vertex AI Gemini API enabled in Firebase Console
let ai: AI | null = null;
let model: GenerativeModel | null = null;
let aiInitError: Error | null = null;

try {
    // Using VertexAIBackend with us-central1 region (default)
    ai = getAI(app, { backend: new VertexAIBackend('us-central1') });
    model = getGenerativeModel(ai, { model: 'gemini-2.0-flash' });
} catch (e) {
    aiInitError = e instanceof Error ? e : new Error('Firebase AI initialization failed');
    console.warn('Firebase AI not initialized - will use fallback templates:', aiInitError.message);
}

// Helper to check AI status - use this in UI to show meaningful errors
export function getAIStatus(): { available: boolean; error?: string } {
    if (model) return { available: true };
    return {
        available: false,
        error: aiInitError?.message || 'Firebase AI Logic is not enabled. Please enable it in the Firebase Console → AI Logic → Get Started.'
    };
}

// Email generation types
export type EmailType = 'introduction' | 'follow-up' | 'discovery' | 'proposal' | 'closing' | 'onboarding' | 're-engagement';
export type EnhancementAction = 'shorter' | 'professional' | 'friendly' | 'urgency' | 'social-proof';

// Map lead status to email type
function getEmailTypeFromStatus(status: string): EmailType {
    const mapping: Record<string, EmailType> = {
        'New': 'introduction',
        'Contacted': 'follow-up',
        'Qualified': 'discovery',
        'Proposal': 'proposal',
        'Negotiation': 'closing',
        'Closed': 'onboarding',
        'Lost': 're-engagement'
    };
    return mapping[status] || 'introduction';
}

// Build company context from enablement resources
function buildCompanyContext(resources: Resource[]): string {
    const sections: string[] = [];

    // Group resources by category
    const playbooks = resources.filter(r => r.category === 'Playbook');
    const templates = resources.filter(r => r.category === 'Templates');
    const competitive = resources.filter(r => r.category === 'Competitive');
    const prospecting = resources.filter(r => r.category === 'Prospecting');

    if (playbooks.length > 0) {
        sections.push(`
SALES PLAYBOOKS & SCRIPTS:
${playbooks.map(p => `- ${p.title}: ${p.description}`).join('\n')}
`);
    }

    if (templates.length > 0) {
        sections.push(`
EMAIL TEMPLATES & PATTERNS:
${templates.map(t => `- ${t.title}: ${t.description}`).join('\n')}
`);
    }

    if (competitive.length > 0) {
        sections.push(`
COMPETITIVE POSITIONING:
${competitive.map(c => `- ${c.title}: ${c.description}`).join('\n')}
`);
    }

    if (prospecting.length > 0) {
        sections.push(`
PROSPECTING & VALUE PROPOSITIONS:
${prospecting.map(p => `- ${p.title}: ${p.description}`).join('\n')}
`);
    }

    return sections.join('\n');
}

// Build lead context from lead data
function buildLeadContext(lead: Lead): string {
    const daysSinceContact = lead.lastContact
        ? Math.floor((Date.now() - lead.lastContact) / (1000 * 60 * 60 * 24))
        : null;

    return `
LEAD INFORMATION:
- Company: ${lead.companyName}
- Contact: ${lead.contactName}
- Email: ${lead.email}
- Phone: ${lead.phone || 'Not provided'}
- Industry: ${lead.industry || 'Not specified'}
- Deal Value: $${lead.value?.toLocaleString() || 'Unknown'}
- Current Status: ${lead.status}
- Probability: ${lead.probability || 'Not set'}%
- Notes: ${lead.notes || 'None'}
- Tags: ${lead.tags?.join(', ') || 'None'}
- Next Step: ${lead.nextStep || 'Not defined'}
${daysSinceContact !== null ? `- Days Since Last Contact: ${daysSinceContact}` : ''}
`;
}

// Generate email draft using Gemini with full context
export async function generateEmail(
    lead: Lead,
    senderName: string,
    customPrompt?: string
): Promise<{ subject: string; body: string }> {

    if (!model) {
        // Fallback if AI not available
        return {
            subject: `Following up - ${lead.companyName}`,
            body: getDefaultEmailBody(lead, senderName)
        };
    }

    const emailType = getEmailTypeFromStatus(lead.status);
    const companyContext = buildCompanyContext(MOCK_RESOURCES);
    const leadContext = buildLeadContext(lead);

    const prompt = `You are an expert sales email writer for our company. Use the following context about our company and sales approach to craft highly personalized emails.

${companyContext}

${leadContext}

EMAIL TYPE: ${emailType}
SENDER NAME: ${senderName}

${customPrompt ? `USER REQUEST: ${customPrompt}` : ''}

INSTRUCTIONS:
- Write a ${emailType} sales email personalized to this specific lead
- Use insights from our sales playbooks and scripts
- Reference our value propositions naturally
- Keep it concise (under 150 words)
- Include a clear, specific call-to-action
- Match the tone to the lead's industry
- If there are notes about the lead, reference them subtly

OUTPUT FORMAT:
Return ONLY a JSON object with exactly this structure (no markdown, no code blocks):
{"subject": "Your subject line here", "body": "Your email body here"}`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Parse the JSON response
        const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleanText);

        return {
            subject: parsed.subject || `Following up - ${lead.companyName}`,
            body: parsed.body || getDefaultEmailBody(lead, senderName)
        };
    } catch (error) {
        console.error('AI email generation failed:', error);
        // Fallback to template
        return {
            subject: `Following up - ${lead.companyName}`,
            body: getDefaultEmailBody(lead, senderName)
        };
    }
}

// Enhance existing email with AI (with company context)
export async function enhanceEmail(email: string, action: EnhancementAction, lead?: Lead): Promise<string> {
    if (!model) return email;

    const companyContext = buildCompanyContext(MOCK_RESOURCES);

    const prompts: Record<EnhancementAction, string> = {
        'shorter': `Make this email more concise while keeping the key message. Reduce to under 100 words:\n\n${email}`,
        'professional': `Rewrite this email in a more formal, professional business tone. Maintain our company's positioning:\n\n${companyContext}\n\nEmail to rewrite:\n${email}`,
        'friendly': `Rewrite this email in a warmer, more friendly and conversational tone while staying professional:\n\n${email}`,
        'urgency': `Add subtle urgency to this email (time-sensitive language, limited availability) without being pushy. Keep it authentic:\n\n${email}`,
        'social-proof': `Add social proof elements to this email naturally. Reference success with similar companies, results, or credibility signals. Use our competitive positioning:\n\n${companyContext}\n\nEmail to enhance:\n${email}`
    };

    try {
        const result = await model.generateContent(prompts[action] + '\n\nReturn ONLY the rewritten email text, nothing else.');
        return result.response.text().trim();
    } catch (error) {
        console.error('AI enhancement failed:', error);
        return email; // Return original on error
    }
}

// Generate email with custom user prompt
export async function generateCustomEmail(
    lead: Lead,
    senderName: string,
    userPrompt: string
): Promise<{ subject: string; body: string }> {
    return generateEmail(lead, senderName, userPrompt);
}

// Default fallback email body
function getDefaultEmailBody(lead: Lead, senderName: string): string {
    const firstName = lead.contactName.split(' ')[0];
    const templates: Record<string, string> = {
        'New': `Hi ${firstName},

I hope this email finds you well! I wanted to reach out and introduce myself – I'm excited about the opportunity to connect with ${lead.companyName}.

I understand that companies in the ${lead.industry || 'technology'} space are constantly looking for ways to improve efficiency and drive growth. I'd love to learn more about your current challenges and share how we might be able to help.

Would you be open to a brief 15-minute call this week?

Best regards,
${senderName}`,

        'Contacted': `Hi ${firstName},

Great connecting with you! I wanted to follow up on our conversation and share some thoughts on how we can support ${lead.companyName}.

Based on what you shared, I think there are real opportunities for us to create value together. Would you have time for a quick call to dive deeper?

Looking forward to hearing from you!

Best,
${senderName}`,

        'Qualified': `Hi ${firstName},

Thank you for taking the time to discuss your needs. I'm genuinely excited about the potential partnership between our companies.

I'm confident we can help ${lead.companyName} achieve the outcomes you're looking for. I'll prepare a customized proposal addressing your specific requirements.

What does your calendar look like this week?

Best,
${senderName}`,

        'Negotiation': `Hi ${firstName},

Thank you for your feedback on the proposal. I appreciate your transparency about the considerations.

I've spoken with our team, and we may have some flexibility. Let's find a solution that works for everyone.

Can we schedule a call to finalize the details?

Best regards,
${senderName}`
    };

    return templates[lead.status] || templates['New'];
}

export { getEmailTypeFromStatus };
