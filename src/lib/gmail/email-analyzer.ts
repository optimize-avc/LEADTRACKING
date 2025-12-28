import { getAI, getGenerativeModel, VertexAIBackend, GenerativeModel } from 'firebase/ai';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { EmailRecord, EmailAnalysis } from './gmail-service';

export type { EmailAnalysis };

// Lazy initialization to avoid build-time errors
let model: GenerativeModel | null = null;
let initialized = false;

function getModel(): GenerativeModel | null {
    if (initialized) return model;
    initialized = true;

    try {
        // Check if Firebase config is available
        if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
            console.warn('Firebase config not available for email analysis');
            return null;
        }

        const firebaseConfig = {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        };

        const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        const ai = getAI(app, { backend: new VertexAIBackend('us-central1') });
        model = getGenerativeModel(ai, { model: 'gemini-2.0-flash' });
    } catch (e) {
        console.warn('Firebase AI not initialized for email analysis:', e);
    }
    return model;
}

/**
 * Analyze an email using AI to extract sentiment, intent, and insights
 */
export async function analyzeEmail(email: EmailRecord): Promise<EmailAnalysis> {
    const currentModel = getModel();
    if (!currentModel) {
        return getDefaultAnalysis();
    }

    const prompt = `Analyze this sales email and extract key insights.

EMAIL:
Direction: ${email.direction === 'sent' ? 'Sent by sales rep' : 'Received from prospect'}
Subject: ${email.subject}
Content: ${email.body.substring(0, 2000)}

Analyze and return a JSON object with exactly this structure (no markdown, no code blocks):
{
    "sentiment": "positive" | "neutral" | "negative",
    "intent": "interested" | "objection" | "question" | "scheduling" | "not_interested" | "unknown",
    "summary": "One sentence summary of the email",
    "keyPoints": ["Key point 1", "Key point 2"],
    "suggestedNextStep": "What the sales rep should do next",
    "dealSignals": ["Any buying signals or red flags detected"]
}

Rules:
- sentiment: Is the overall tone positive, neutral, or negative?
- intent: What is the prospect trying to communicate?
  - interested: Showing genuine interest
  - objection: Raising concerns or pushback
  - question: Asking for more information
  - scheduling: Trying to set up a meeting
  - not_interested: Declining or unsubscribing
  - unknown: Can't determine intent
- dealSignals: Look for phrases like "budget approved", "decision maker", "timeline", "competitor mentioned", etc.`;

    try {
        const result = await currentModel.generateContent(prompt);
        const text = result.response.text();
        const cleanText = text
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error('Email analysis failed:', error);
        return getDefaultAnalysis();
    }
}

/**
 * Analyze a full email thread to get conversation summary
 */
export async function analyzeEmailThread(emails: EmailRecord[]): Promise<{
    threadSummary: string;
    overallSentiment: 'positive' | 'neutral' | 'negative';
    engagementLevel: 'high' | 'medium' | 'low';
    nextBestAction: string;
    dealHealth: 'healthy' | 'at-risk' | 'stalled';
}> {
    const currentModel = getModel();
    if (!currentModel || emails.length === 0) {
        return {
            threadSummary: 'No emails to analyze',
            overallSentiment: 'neutral',
            engagementLevel: 'low',
            nextBestAction: 'Send initial outreach',
            dealHealth: 'stalled',
        };
    }

    const threadContent = emails
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((e) => `[${e.direction.toUpperCase()}] ${e.subject}\n${e.body.substring(0, 500)}`)
        .join('\n\n---\n\n');

    const prompt = `Analyze this email thread between a sales rep and prospect.

EMAIL THREAD (${emails.length} emails):
${threadContent.substring(0, 4000)}

Return a JSON object with exactly this structure:
{
    "threadSummary": "2-3 sentence summary of the conversation",
    "overallSentiment": "positive" | "neutral" | "negative",
    "engagementLevel": "high" | "medium" | "low",
    "nextBestAction": "Specific action the sales rep should take",
    "dealHealth": "healthy" | "at-risk" | "stalled"
}

Consider:
- Response times (quick = engaged)
- Number of back-and-forth exchanges
- Questions being asked
- Positive vs negative language`;

    try {
        const result = await currentModel.generateContent(prompt);
        const text = result.response.text();
        const cleanText = text
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error('Thread analysis failed:', error);
        return {
            threadSummary: 'Analysis unavailable',
            overallSentiment: 'neutral',
            engagementLevel: 'medium',
            nextBestAction: 'Follow up with the prospect',
            dealHealth: 'at-risk',
        };
    }
}

/**
 * Generate a reply suggestion based on the email thread
 */
export async function suggestReply(
    emails: EmailRecord[],
    customContext?: string
): Promise<{
    subject: string;
    body: string;
}> {
    const currentModel = getModel();
    if (!currentModel) {
        return {
            subject: 'Re: ' + (emails[0]?.subject || 'Follow up'),
            body: 'Thanks for your email. I wanted to follow up...',
        };
    }

    const lastEmail = emails[0];
    const threadContext = emails
        .slice(0, 5)
        .map((e) => `[${e.direction}] ${e.body.substring(0, 300)}`)
        .join('\n\n');

    const prompt = `Generate a reply to this email thread.

RECENT EMAILS:
${threadContext}

${customContext ? `ADDITIONAL CONTEXT: ${customContext}` : ''}

Generate a professional, helpful reply. Return JSON:
{
    "subject": "Re: Original Subject",
    "body": "The email body"
}

Keep the reply:
- Concise (under 150 words)
- Professional but friendly
- Include a clear next step or call to action`;

    try {
        const result = await currentModel.generateContent(prompt);
        const text = result.response.text();
        const cleanText = text
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error('Reply suggestion failed:', error);
        return {
            subject: 'Re: ' + (lastEmail?.subject || 'Follow up'),
            body: 'Thanks for your message. I wanted to follow up on our conversation.',
        };
    }
}

function getDefaultAnalysis(): EmailAnalysis {
    return {
        sentiment: 'neutral',
        intent: 'unknown',
        summary: 'Analysis unavailable',
        keyPoints: [],
        suggestedNextStep: 'Review email manually',
        dealSignals: [],
    };
}
