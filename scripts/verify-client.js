const { initializeApp } = require('firebase/app');
const {
    getFirestore,
    collection,
    addDoc,
    doc,
    setDoc,
    getDocs,
    query,
    where,
} = require('firebase/firestore');
const Twilio = require('twilio');

// Config
const firebaseConfig = {
    apiKey: 'AIzaSyDK6-V94VNzc5pTCgXzKvY9UA00Z0oCSRc',
    authDomain: 'antigrav-tracking-final.firebaseapp.com',
    projectId: 'antigrav-tracking-final',
    storageBucket: 'antigrav-tracking-final.firebasestorage.app',
    messagingSenderId: '813307578320',
    appId: '1:813307578320:web:fb167e5ac138fe9ac91bd5',
};

// Secrets (User must set these in env or replace manually for testing)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'AC_PLACEHOLDER';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'AUTH_TOKEN_PLACEHOLDER';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+15555555555';

const USER_ID = '4Q4AmzaE3nMo1iSBCDzBnF0vCE03';
const LEAD_PHONE = '+17087013737';
const LEAD_CONTACT_NAME = 'Verification Test User';

async function run() {
    console.log('Initializing Firebase Client...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const client = Twilio(TWILIO_CONFIG.accountSid, TWILIO_CONFIG.authToken);

    try {
        // 1. Check/Create Lead
        console.log('Checking for lead...');
        const leadsRef = collection(db, 'users', USER_ID, 'leads');
        const q = query(leadsRef, where('phone', '==', LEAD_PHONE));
        const snapshot = await getDocs(q);

        let leadId;
        if (snapshot.empty) {
            console.log('Creating new lead...');
            const newLead = await addDoc(leadsRef, {
                contactName: LEAD_CONTACT_NAME,
                phone: LEAD_PHONE,
                status: 'New',
                assignedTo: USER_ID,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            leadId = newLead.id;
            console.log('Created lead:', leadId);
        } else {
            leadId = snapshot.docs[0].id;
            console.log('Found existing lead:', leadId);
        }

        // 2. Send SMS via Twilio
        console.log('Sending SMS via Twilio...');
        const message = await client.messages.create({
            to: LEAD_PHONE,
            from: TWILIO_CONFIG.phoneNumber,
            body: 'Hello! This is a test from the Antigravity system. Please reply to this message.',
            // We use the production webhook URL here so Twilio updates the status there
            statusCallback: `https://antigrav-tracking-final.web.app/api/twilio/sms-webhook?userId=${USER_ID}&leadId=${leadId}`,
        });

        console.log('SMS Sent! SID:', message.sid);

        // 3. Log to Firestore (Outbound) so it shows in UI
        console.log('Logging to Firestore...');
        await setDoc(doc(db, 'users', USER_ID, 'messages', message.sid), {
            messageSid: message.sid,
            userId: USER_ID,
            leadId: leadId,
            toNumber: LEAD_PHONE,
            fromNumber: TWILIO_CONFIG.phoneNumber,
            body: message.body,
            status: message.status,
            direction: 'outbound',
            sentAt: new Date().toISOString(),
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        console.log('Done! Message logged.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

run();
