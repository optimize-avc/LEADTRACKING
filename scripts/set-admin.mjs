/**
 * Set Admin Role for a User
 * Usage: node scripts/set-admin.mjs <email>
 *
 * This script sets a user's role to 'admin' in Firestore.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Find service account file
const possiblePaths = [
    '../firebase-service-account.json',
    '../antigrav-tracking-final-firebase-adminsdk.json',
    '../service-account.json',
];

let serviceAccountPath = null;
for (const p of possiblePaths) {
    const fullPath = resolve(import.meta.dirname, p);
    if (existsSync(fullPath)) {
        serviceAccountPath = fullPath;
        break;
    }
}

if (!serviceAccountPath) {
    // Try environment variable
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    } else {
        console.error('❌ No service account file found!');
        console.log(
            'Expected one of:',
            possiblePaths.map((p) => resolve(import.meta.dirname, p))
        );
        process.exit(1);
    }
}

console.log(`📁 Using service account: ${serviceAccountPath}`);

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
    credential: cert(serviceAccount),
});

const db = getFirestore();
const auth = getAuth();

const email = process.argv[2];

if (!email) {
    console.error('Usage: node scripts/set-admin.mjs <email>');
    process.exit(1);
}

console.log(`\n🔍 Looking up user: ${email}`);

try {
    // Get user by email from Firebase Auth
    const userRecord = await auth.getUserByEmail(email);
    console.log(`✅ Found user in Auth: ${userRecord.uid}`);

    // Update user document in Firestore
    const userRef = db.collection('users').doc(userRecord.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        console.log('⚠️  User document does not exist in Firestore, creating...');
        await userRef.set({
            email: email,
            role: 'admin',
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    } else {
        console.log(`📝 Current role: ${userDoc.data()?.role || 'none'}`);
        await userRef.update({
            role: 'admin',
            updatedAt: Date.now(),
        });
    }

    console.log(`\n✅ Successfully set ${email} as ADMIN!`);
    console.log('   They can now delete any leads and access admin features.');
} catch (error) {
    if (error.code === 'auth/user-not-found') {
        console.error(`❌ User with email ${email} not found in Firebase Auth.`);
        console.log('   They need to sign up first, then run this script again.');
    } else {
        console.error('❌ Error:', error.message);
    }
    process.exit(1);
}

process.exit(0);
