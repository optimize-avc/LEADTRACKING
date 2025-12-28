import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase config is valid (has actual values, not empty strings)
function isFirebaseConfigValid(): boolean {
    return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId);
}

// Cached instances
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

// Getter functions for lazy initialization - call these at runtime, not module load
export function getFirebaseApp(): FirebaseApp {
    if (!_app) {
        if (!isFirebaseConfigValid()) {
            throw new Error(
                'Firebase config is not valid. Ensure NEXT_PUBLIC_FIREBASE_* environment variables are set.'
            );
        }
        _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    }
    return _app;
}

export function getFirebaseAuth(): Auth {
    if (!_auth) {
        _auth = getAuth(getFirebaseApp());
    }
    return _auth;
}

export function getFirebaseDb(): Firestore {
    if (!_db) {
        _db = getFirestore(getFirebaseApp());
    }
    return _db;
}

export function getFirebaseStorage(): FirebaseStorage {
    if (!_storage) {
        _storage = getStorage(getFirebaseApp());
    }
    return _storage;
}

// Legacy exports for backward compatibility - these call the getter functions
// WARNING: These will throw at build time if accessed during static analysis
// For new code, prefer using the getter functions directly
export const app =
    typeof window !== 'undefined' ? getFirebaseApp() : (null as unknown as FirebaseApp);
export const auth = typeof window !== 'undefined' ? getFirebaseAuth() : (null as unknown as Auth);
export const db = typeof window !== 'undefined' ? getFirebaseDb() : (null as unknown as Firestore);
export const storage =
    typeof window !== 'undefined' ? getFirebaseStorage() : (null as unknown as FirebaseStorage);
