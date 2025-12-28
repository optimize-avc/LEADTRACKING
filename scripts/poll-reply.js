const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, orderBy } = require('firebase/firestore');

// Config
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIza...',
    authDomain: 'antigrav-tracking-final.firebaseapp.com',
    projectId: 'antigrav-tracking-final',
    storageBucket: 'antigrav-tracking-final.firebasestorage.app',
    messagingSenderId: '813307578320',
    appId: '1:813307578320:web:fb167e5ac138fe9ac91bd5',
};

const USER_ID = '4Q4AmzaE3nMo1iSBCDzBnF0vCE03';

async function poll() {
    console.log('Polling for inbound messages...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const messagesRef = collection(db, 'users', USER_ID, 'messages');
    // Check for recent inbound messages
    const q = query(messagesRef, where('direction', '==', 'inbound'), orderBy('createdAt', 'desc'));

    let checks = 0;
    const interval = setInterval(async () => {
        process.stdout.write('.');
        checks++;
        if (checks > 60) {
            // 2 minutes
            console.log('\nTimeout waiting for reply.');
            clearInterval(interval);
            process.exit(1);
        }

        try {
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                // Find the latest one
                const latest = snapshot.docs[0].data();
                console.log('\nResponse Received!', latest.body);
                clearInterval(interval);
                process.exit(0);
            }
        } catch (e) {
            console.error(e);
        }
    }, 2000);
}

poll();
