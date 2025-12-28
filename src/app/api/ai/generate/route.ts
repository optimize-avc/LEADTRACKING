import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyIdToken } from '@/lib/firebase/admin';

// API key - check multiple possible env var names for flexibility
const GEMINI_API_KEY =
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    '';

// Vertex AI client (lazy initialized)
let vertexAIClient: unknown = null;
let vertexInitAttempted = false;
let vertexInitError: string | null = null;

// Google GenAI client (lazy initialized)
let genAI: GoogleGenerativeAI | null = null;

async function tryInitializeVertexAI(): Promise<unknown> {
    if (vertexAIClient) return vertexAIClient;
    if (vertexInitAttempted) return null; // Don't retry if already failed

    vertexInitAttempted = true;

    try {
        const { VertexAI } = await import('@google-cloud/vertexai');
        const projectId =
            process.env.GOOGLE_CLOUD_PROJECT ||
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
            'antigrav-tracking-final';
        vertexAIClient = new VertexAI({ project: projectId, location: 'us-central1' });
        return vertexAIClient;
    } catch (e) {
        vertexInitError = e instanceof Error ? e.message : 'Unknown error';
        console.warn('[AI Route] Vertex AI initialization failed:', vertexInitError);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt, modelName = 'gemini-2.0-flash' } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // --- AUTHENTICATION CHECK ---
        // For production, we must verify the user is authenticated
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // Local dev exception (optional, but better to be strict)
            if (process.env.NODE_ENV !== 'development') {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        } else {
            const token = authHeader.split('Bearer ')[1];
            const decodedToken = await verifyIdToken(token);
            if (!decodedToken) {
                return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
            }
            // User is authenticated
        }

        // ALWAYS try Vertex AI first (works in App Hosting with ADC)

        // ALWAYS try Vertex AI first (works in App Hosting with ADC)
        try {
            const vertexAI = await tryInitializeVertexAI();
            if (vertexAI) {
                const model = (
                    vertexAI as unknown as {
                        getGenerativeModel: (config: { model: string }) => {
                            generateContent: (prompt: string) => Promise<{
                                response?: {
                                    candidates?: Array<{
                                        content?: { parts?: Array<{ text?: string }> };
                                    }>;
                                };
                            }>;
                        };
                    }
                ).getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                return NextResponse.json({ text });
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error';
            console.warn('[AI Route] Vertex AI generation failed:', errorMsg);
            // Fall through to API key fallback
        }

        // Fallback to Google Generative AI SDK with API key
        if (!GEMINI_API_KEY) {
            console.error('[AI Route] No API key available for fallback');
            return NextResponse.json(
                {
                    error: 'AI service unavailable. Vertex AI failed to initialize and no API key is configured.',
                    vertexError: vertexInitError,
                },
                { status: 500 }
            );
        }

        if (!genAI) {
            genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        }

        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ text });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('[AI Route] Fatal error:', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
