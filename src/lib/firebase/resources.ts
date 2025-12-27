
import { db, storage } from '@/lib/firebase/config';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Resource } from '@/types';

export const ResourcesService = {
    // Upload a new resource
    async uploadResource(userId: string, file: File, category: string, description: string, visibility: 'private' | 'company' = 'private'): Promise<string> {
        // 1. Upload to Storage
        const path = visibility === 'company' ? `resources/${Date.now()}_${file.name}` : `users/${userId}/resources/${Date.now()}_${file.name}`;
        const fileRef = ref(storage, path);
        const snapshot = await uploadBytes(fileRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);

        // 2. Save Metadata to Firestore
        const resourcesRef = visibility === 'company'
            ? collection(db, 'resources')
            : collection(db, 'users', userId, 'resources');
        const now = new Date().toISOString();

        const docRef = await addDoc(resourcesRef, {
            title: file.name,
            description: description || 'No description provided',
            type: determineFileType(file.type),
            category: category,
            url: downloadUrl,
            storagePath: snapshot.ref.fullPath,
            createdAt: now,
            updatedAt: now,
            createdBy: userId,
            visibility
        });

        return docRef.id;
    },

    // Get company-wide resources
    async getCompanyResources(): Promise<Resource[]> {
        const resourcesRef = collection(db, 'resources'); // Top-level collection
        const q = query(resourcesRef, orderBy('createdAt', 'desc'));

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Resource[];
    },

    // Get all resources for a user
    async getUserResources(userId: string): Promise<Resource[]> {
        const resourcesRef = collection(db, 'users', userId, 'resources');
        const q = query(resourcesRef, orderBy('createdAt', 'desc'));

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Resource[];
    },

    // Delete a resource
    async deleteResource(userId: string, resourceId: string, storagePath: string): Promise<void> {
        // 1. Delete from Firestore
        await deleteDoc(doc(db, 'users', userId, 'resources', resourceId));

        // 2. Delete from Storage
        if (storagePath) {
            const fileRef = ref(storage, storagePath);
            await deleteObject(fileRef).catch(e => console.warn('File already deleted or not found', e));
        }
    }
};

function determineFileType(mimeType: string): 'video' | 'deck' | 'sheet' | 'document' | 'link' {
    if (mimeType.includes('pdf')) return 'document';
    if (mimeType.includes('video')) return 'video';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'sheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'deck';
    return 'document'; // default
}
