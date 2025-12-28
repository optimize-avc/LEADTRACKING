import { getAI, getGenerativeModel, VertexAIBackend, AI, GenerativeModel } from 'firebase/ai';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';

/**
 * Enterprise-grade Managed RAG Service (Dec 2025)
 * Interfaces with Gemini File Search (Vertex AI) to ground AI responses in personal docs.
 */

export interface RAGResult {
    content: string;
    source: string;
    score: number;
}

// Lazy initialization to avoid build-time errors
let _app: FirebaseApp | null = null;
let _ai: AI | null = null;
let _model: GenerativeModel | null = null;

function getFirebaseApp(): FirebaseApp | null {
    if (_app) return _app;

    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
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

    _app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    return _app;
}

function getAIInstance(): AI | null {
    if (_ai) return _ai;

    const app = getFirebaseApp();
    if (!app) return null;

    try {
        _ai = getAI(app, { backend: new VertexAIBackend('us-central1') });
        return _ai;
    } catch (e) {
        console.warn('Failed to initialize Firebase AI:', e);
        return null;
    }
}

function getRAGModel(): GenerativeModel | null {
    if (_model) return _model;

    const ai = getAIInstance();
    if (!ai) return null;

    try {
        _model = getGenerativeModel(ai, {
            model: 'gemini-2.0-flash',
            // Enable File Search tool for Managed RAG
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tools: [{ fileSearch: {} } as unknown as any], // Bypass SDK type limitation for beta fileSearch tool
        });
        return _model;
    } catch (e) {
        console.warn('Failed to initialize RAG model:', e);
        return null;
    }
}

export class RAGService {
    /**
     * Query the managed document corpus for relevant context.
     * In a production environment, this would search across indexed Playbooks/Pdfs.
     */
    static async queryContext(query: string): Promise<string> {
        const model = getRAGModel();
        if (!model) {
            return 'Fallback: Unable to retrieve personalized document context (model not initialized).';
        }

        try {
            // Dec 2025 Best Practice: Managed RAG handles retrieval + generation in one pass
            // by referencing the tool-enabled model.
            const prompt = `Use the available file search tool to find information related to: "${query}". 
            If no specific documents match, provide general best practices based on our sales enablement philosophy.`;

            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error: unknown) {
            console.error('RAG Query Failed:', error);
            return 'Fallback: Unable to retrieve personalized document context.';
        }
    }

    /**
     * Note: In a live environment, you would use the Vertex AI Admin SDK or
     * a dedicated API endpoint to upload and index files into the 'Search Store'.
     * This service facilitates the retrieval side.
     */
}
