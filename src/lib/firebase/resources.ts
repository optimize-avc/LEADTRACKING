import { getFirebaseDb, getFirebaseStorage } from '@/lib/firebase/config';
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    deleteDoc,
    doc,
    orderBy,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Resource } from '@/types';

export const ResourcesService = {
    // Upload a new resource
    async uploadResource(
        userId: string,
        file: File,
        category: string,
        description: string,
        visibility: 'private' | 'company' = 'private'
    ): Promise<string> {
        // 1. Upload to Storage
        const path =
            visibility === 'company'
                ? `resources/${Date.now()}_${file.name}`
                : `users/${userId}/resources/${Date.now()}_${file.name}`;
        const fileRef = ref(getFirebaseStorage(), path);
        const snapshot = await uploadBytes(fileRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);

        // 2. Save Metadata to Firestore
        const resourcesRef =
            visibility === 'company'
                ? collection(getFirebaseDb(), 'resources')
                : collection(getFirebaseDb(), 'users', userId, 'resources');
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
            visibility,
        });

        return docRef.id;
    },

    // Get company-wide resources
    async getCompanyResources(): Promise<Resource[]> {
        const resourcesRef = collection(getFirebaseDb(), 'resources'); // Top-level collection
        // Note: Single-field orderBy on createdAt should work without composite index
        const q = query(resourcesRef);

        const snapshot = await getDocs(q);
        const resources = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Resource[];

        // Sort client-side to avoid index requirements
        return resources.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
        });
    },

    // Get all resources for a user
    async getUserResources(userId: string): Promise<Resource[]> {
        const resourcesRef = collection(getFirebaseDb(), 'users', userId, 'resources');
        const q = query(resourcesRef, orderBy('createdAt', 'desc'));

        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Resource[];
    },

    // Delete a resource
    async deleteResource(userId: string, resourceId: string, storagePath: string): Promise<void> {
        // 1. Delete from Firestore
        await deleteDoc(doc(getFirebaseDb(), 'users', userId, 'resources', resourceId));

        // 2. Delete from Storage
        if (storagePath) {
            const fileRef = ref(getFirebaseStorage(), storagePath);
            await deleteObject(fileRef).catch((e) =>
                console.warn('File already deleted or not found', e)
            );
        }
    },
};

function determineFileType(mimeType: string): 'video' | 'deck' | 'sheet' | 'document' | 'link' {
    if (mimeType.includes('pdf')) return 'document';
    if (mimeType.includes('video')) return 'video';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv'))
        return 'sheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'deck';
    return 'document'; // default
}
