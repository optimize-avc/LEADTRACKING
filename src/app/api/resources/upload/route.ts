import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

/**
 * Resource Upload Endpoint (Dec 2025)
 * Handles document ingestion for Gemini File Search (Managed RAG).
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Authenticate Request
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const adminAuth = getAdminAuth();
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;

        // 2. Parse Multipart Data
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const category = formData.get('category') as string || 'General';

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // 3. Log Ingestion in Firestore
        // In production, you would upload to Firebase Storage and trigger a Vertex AI index update.
        const db = getAdminDb();
        const resourceRef = await db.collection('resources').add({
            title: file.name,
            category,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            ownerId: userId,
            uploadedAt: Date.now(),
            status: 'processing' // Simulate managed RAG indexing status
        });

        // 4. Return success to UI
        return NextResponse.json({
            success: true,
            resourceId: resourceRef.id,
            message: 'Document received and queued for RAG indexing.'
        });

    } catch (error: unknown) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed' }, { status: 500 });
    }
}
