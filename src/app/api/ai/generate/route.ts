import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// For local development fallback
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

// Vertex AI client (lazy initialized)
let vertexAIClient: any = null;
let vertexInitAttempted = false;
let vertexInitError: string | null = null;

// Google GenAI client (lazy initialized)  
let genAI: GoogleGenerativeAI | null = null;

async function tryInitializeVertexAI(): Promise<any> {
    if (vertexAIClient) return vertexAIClient;
    if (vertexInitAttempted) return null; // Don't retry if already failed

    vertexInitAttempted = true;

    try {
        const { VertexAI } = await import('@google-cloud/vertexai');
        const projectId = process.env.GOOGLE_CLOUD_PROJECT ||
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
            'antigrav-tracking-final';
        console.log('[AI Route] Initializing Vertex AI for project:', projectId);
        vertexAIClient = new VertexAI({ project: projectId, location: 'us-central1' });
        console.log('[AI Route] Vertex AI initialized successfully');
        return vertexAIClient;
    } catch (e) {
        vertexInitError = e instanceof Error ? e.message : 'Unknown error';
        console.warn('[AI Route] Vertex AI initialization failed:', vertexInitError);
        return null;
    }
}

export async function POST(req: NextRequest) {
    // Log environment info for debugging
    console.log('[AI Route] Environment check:', {
        GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT ? 'SET' : 'NOT SET',
        K_SERVICE: process.env.K_SERVICE ? 'SET' : 'NOT SET',
        hasApiKey: GEMINI_API_KEY ? 'YES' : 'NO',
    });

    try {
        const body = await req.json();
        const { prompt, modelName = "gemini-2.0-flash" } = body;

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        console.log('[AI Route] Request model:', modelName);

        // ALWAYS try Vertex AI first (works in App Hosting with ADC)
        try {
            const vertexAI = await tryInitializeVertexAI();
            if (vertexAI) {
                console.log('[AI Route] Using Vertex AI...');
                const model = vertexAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                console.log('[AI Route] Vertex AI success, response length:', text.length);
                return NextResponse.json({ text });
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error';
            console.warn('[AI Route] Vertex AI generation failed:', errorMsg);
            // Fall through to API key fallback
        }

        // Fallback to Google Generative AI SDK with API key
        console.log('[AI Route] Falling back to API key...');

        if (!GEMINI_API_KEY) {
            console.error('[AI Route] No API key available for fallback');
            return NextResponse.json(
                {
                    error: "AI service unavailable. Vertex AI failed to initialize and no API key is configured.",
                    vertexError: vertexInitError
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

        console.log('[AI Route] API key success, response length:', text.length);
        return NextResponse.json({ text });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('[AI Route] Fatal error:', error);
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
