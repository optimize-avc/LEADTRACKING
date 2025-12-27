/**
 * Firebase Admin SDK Initialization
 * 
 * Singleton pattern for initializing Firebase Admin SDK.
 * Uses environment variables for configuration.
 * 
 * For production, you should use a service account JSON file.
 * See: https://firebase.google.com/docs/admin/setup
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;

/**
 * Check if running on server
 */
function isServer(): boolean {
    return typeof window === 'undefined';
}

/**
 * Get or initialize Firebase Admin App
 * 
 * Uses Application Default Credentials when running in Google Cloud,
 * or falls back to project ID only for development.
 */
export function getAdminApp(): App {
    if (!isServer()) {
        throw new Error('Firebase Admin SDK can only be used on the server');
    }

    if (adminApp) {
        return adminApp;
    }

    if (getApps().length > 0) {
        adminApp = getApps()[0];
        return adminApp;
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId) {
        throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set');
    }

    // If service account credentials are available, use them
    if (clientEmail && privateKey) {
        adminApp = initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
    } else {
        // Fall back to project ID only (works with Application Default Credentials)
        // This is suitable for local development and Google Cloud environments
        console.warn('Firebase Admin: Using project ID only. For production, set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.');
        adminApp = initializeApp({
            projectId,
        });
    }

    return adminApp;
}

/**
 * Get Firebase Admin Auth instance
 */
export function getAdminAuth(): Auth {
    if (adminAuth) {
        return adminAuth;
    }

    const app = getAdminApp();
    adminAuth = getAuth(app);
    return adminAuth;
}

/**
 * Get Firebase Admin Firestore instance
 */
export function getAdminDb(): Firestore {
    if (adminDb) {
        return adminDb;
    }

    const app = getAdminApp();
    adminDb = getFirestore(app);
    return adminDb;
}

/**
 * Verify a Firebase ID token
 * 
 * @param idToken - The Firebase ID token to verify
 * @returns Decoded token with user info, or null if invalid
 */
export async function verifyIdToken(idToken: string): Promise<{
    uid: string;
    email?: string;
    name?: string;
} | null> {
    try {
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);

        return {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name,
        };
    } catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
}
