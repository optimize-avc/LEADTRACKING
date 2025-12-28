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

// Lazy initialization to avoid build-time errors when env vars aren't set
let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _storage: FirebaseStorage | undefined;

// Initialize Firebase lazily
function initializeFirebase(): FirebaseApp {
    if (!_app) {
        if (!isFirebaseConfigValid()) {
            throw new Error(
                'Firebase config is not valid. Ensure NEXT_PUBLIC_FIREBASE_* environment variables are set.'
            );
        }
        _app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    }
    return _app;
}

// Create proxy objects that lazy-initialize on first property access
// This allows imports to work at build time but defers actual initialization to runtime

function createFirebaseProxy<T extends object>(getter: () => T, name: string): T {
    // In server environments during build, return a proxy that defers access
    const handler: ProxyHandler<T> = {
        get(_target, prop) {
            const instance = getter();
            const value = (instance as Record<string | symbol, unknown>)[prop];
            return typeof value === 'function' ? value.bind(instance) : value;
        },
        apply(_target, _thisArg, args) {
            // For callable proxies (like auth functions)
            const instance = getter();
            if (typeof instance === 'function') {
                return (instance as (...args: unknown[]) => unknown)(...args);
            }
            throw new Error(`${name} is not callable`);
        },
    };
    return new Proxy(Object.create(null) as T, handler);
}

// Getter functions for lazy initialization
function getFirebaseApp(): FirebaseApp {
    return initializeFirebase();
}

function getFirebaseAuth(): Auth {
    if (!_auth) {
        _auth = getAuth(initializeFirebase());
    }
    return _auth;
}

function getFirebaseDb(): Firestore {
    if (!_db) {
        _db = getFirestore(initializeFirebase());
    }
    return _db;
}

function getFirebaseStorage(): FirebaseStorage {
    if (!_storage) {
        _storage = getStorage(initializeFirebase());
    }
    return _storage;
}

// Export lazy proxies that look like the actual Firebase instances
// They only initialize when a property is accessed at runtime
export const app = createFirebaseProxy(getFirebaseApp, 'app');
export const auth = createFirebaseProxy(getFirebaseAuth, 'auth');
export const db = createFirebaseProxy(getFirebaseDb, 'db');
export const storage = createFirebaseProxy(getFirebaseStorage, 'storage');
