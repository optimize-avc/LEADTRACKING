import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        refresh: vi.fn(),
        prefetch: vi.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
}));

// Mock next/image
vi.mock('next/image', () => ({
    default: function MockImage({ src, alt }: { src: string; alt: string }) {
        return React.createElement('img', { src, alt });
    },
}));

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({})),
    onAuthStateChanged: vi.fn((auth, callback) => {
        callback(null);
        return vi.fn();
    }),
    signInWithPopup: vi.fn(),
    GoogleAuthProvider: vi.fn(),
    signOut: vi.fn(),
}));

// Mock Firestore
vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn(),
    doc: vi.fn(),
    addDoc: vi.fn(),
    getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => null })),
    getDocs: vi.fn(() => Promise.resolve({ docs: [], forEach: vi.fn() })),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    Timestamp: {
        now: vi.fn(() => ({ toMillis: () => Date.now() })),
        fromMillis: vi.fn((ms: number) => ({ toMillis: () => ms })),
    },
}));

// Mock Firebase config
vi.mock('@/lib/firebase/config', () => ({
    app: {},
    auth: {},
    db: {},
}));

// Mock Firebase AI
vi.mock('firebase/ai', () => ({
    getAI: vi.fn(),
    getGenerativeModel: vi.fn(),
    VertexAIBackend: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
    },
    Toaster: () => null,
}));
