// Find and remove duplicate leads
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDqXoP_7p0zBJDT-aiLwIbUjPZlvEqRkx8',
    authDomain: 'antigrav-tracking-final.firebaseapp.com',
    projectId: 'antigrav-tracking-final',
    storageBucket: 'antigrav-tracking-final.firebasestorage.app',
    messagingSenderId: '1040283638498',
    appId: '1:1040283638498:web:d02f80d78c2aed0785c71f',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findAndRemoveDuplicates() {
    console.log('Fetching all leads...');
    const snapshot = await getDocs(collection(db, 'leads'));
    const leads = [];
    snapshot.forEach((doc) => {
        leads.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Total leads: ${leads.length}`);

    // Group by company name (normalized)
    const byName = {};
    leads.forEach((lead) => {
        const name = (lead.companyName || '').toLowerCase().trim().replace(/\s+/g, ' ');
        if (!name) return;
        if (!byName[name]) byName[name] = [];
        byName[name].push(lead);
    });

    // Find duplicates
    const duplicates = Object.entries(byName)
        .filter(([name, arr]) => arr.length > 1)
        .sort((a, b) => b[1].length - a[1].length);

    console.log(`\nDuplicate groups found: ${duplicates.length}`);

    // Show duplicates
    let toDelete = [];
    for (const [name, arr] of duplicates) {
        console.log(`\n"${name}" - ${arr.length} copies:`);
        // Sort by createdAt, keep the newest one
        arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        arr.forEach((lead, i) => {
            const keep = i === 0 ? ' [KEEP]' : ' [DELETE]';
            console.log(
                `  ${lead.id} - created: ${new Date(lead.createdAt).toLocaleDateString()}${keep}`
            );
            if (i > 0) toDelete.push(lead.id);
        });
    }

    console.log(`\n\nTotal to delete: ${toDelete.length}`);
    console.log('IDs to delete:', toDelete);

    // To actually delete, uncomment below:
    // console.log('\nDeleting duplicates...');
    // for (const id of toDelete) {
    //   await deleteDoc(doc(db, 'leads', id));
    //   console.log(`Deleted: ${id}`);
    // }
    // console.log('Done!');
}

findAndRemoveDuplicates().catch(console.error);
