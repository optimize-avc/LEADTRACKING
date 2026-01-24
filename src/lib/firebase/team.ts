import { getFirebaseDb } from './config';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
} from 'firebase/firestore';

export type TeamRole = 'admin' | 'manager' | 'rep';

export interface TeamMember {
    id: string;
    email: string;
    name: string;
    role: TeamRole;
    avatar?: string;
    status: 'active' | 'pending';
    joinedAt?: number;
    invitedBy?: string;
}

export interface TeamInvite {
    id: string;
    email: string;
    role: TeamRole;
    invitedBy: string;
    invitedByName: string;
    companyId: string;
    companyName: string;
    createdAt: number;
    expiresAt: number;
    status: 'pending' | 'accepted' | 'expired';
}

/**
 * TeamService - Manages team members for multi-tenant companies
 */
export const TeamService = {
    /**
     * Get all team members for a company
     */
    async getTeamMembers(companyId: string): Promise<TeamMember[]> {
        const db = getFirebaseDb();
        const teamRef = collection(db, 'companies', companyId, 'team');
        const snapshot = await getDocs(teamRef);

        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as TeamMember[];
    },

    /**
     * Get a single team member
     */
    async getTeamMember(companyId: string, userId: string): Promise<TeamMember | null> {
        const db = getFirebaseDb();
        const memberRef = doc(db, 'companies', companyId, 'team', userId);
        const memberSnap = await getDoc(memberRef);

        if (!memberSnap.exists()) return null;
        return { id: memberSnap.id, ...memberSnap.data() } as TeamMember;
    },

    /**
     * Add a team member (used when invite is accepted)
     */
    async addTeamMember(companyId: string, member: Omit<TeamMember, 'id'>): Promise<string> {
        const db = getFirebaseDb();
        const memberRef = doc(collection(db, 'companies', companyId, 'team'));

        await setDoc(memberRef, {
            ...member,
            joinedAt: Date.now(),
        });

        return memberRef.id;
    },

    /**
     * Update a team member's role (admin only)
     */
    async updateMemberRole(companyId: string, userId: string, newRole: TeamRole): Promise<void> {
        const db = getFirebaseDb();
        const memberRef = doc(db, 'companies', companyId, 'team', userId);

        await updateDoc(memberRef, {
            role: newRole,
            updatedAt: Date.now(),
        });
    },

    /**
     * Remove a team member (admin only)
     */
    async removeMember(companyId: string, userId: string): Promise<void> {
        const db = getFirebaseDb();
        const memberRef = doc(db, 'companies', companyId, 'team', userId);
        await deleteDoc(memberRef);

        // Also update the user's profile to remove company association
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            companyId: null,
            role: null,
            updatedAt: Date.now(),
        });
    },

    // =========================================================================
    // INVITE MANAGEMENT
    // =========================================================================

    /**
     * Create a team invite
     */
    async createInvite(
        companyId: string,
        companyName: string,
        email: string,
        role: TeamRole,
        invitedBy: string,
        invitedByName: string
    ): Promise<string> {
        const db = getFirebaseDb();
        const inviteRef = doc(collection(db, 'companies', companyId, 'invites'));

        const invite: Omit<TeamInvite, 'id'> = {
            email: email.toLowerCase(),
            role,
            invitedBy,
            invitedByName,
            companyId,
            companyName,
            createdAt: Date.now(),
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
            status: 'pending',
        };

        await setDoc(inviteRef, invite);
        return inviteRef.id;
    },

    /**
     * Get pending invites for a company
     */
    async getPendingInvites(companyId: string): Promise<TeamInvite[]> {
        const db = getFirebaseDb();
        const invitesRef = collection(db, 'companies', companyId, 'invites');
        const q = query(invitesRef, where('status', '==', 'pending'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as TeamInvite[];
    },

    /**
     * Get invite by ID (for accept flow)
     */
    async getInvite(companyId: string, inviteId: string): Promise<TeamInvite | null> {
        const db = getFirebaseDb();
        const inviteRef = doc(db, 'companies', companyId, 'invites', inviteId);
        const inviteSnap = await getDoc(inviteRef);

        if (!inviteSnap.exists()) return null;
        return { id: inviteSnap.id, ...inviteSnap.data() } as TeamInvite;
    },

    /**
     * Accept an invite - add user to team and update invite status
     */
    async acceptInvite(
        companyId: string,
        inviteId: string,
        userId: string,
        userName: string,
        userAvatar?: string
    ): Promise<void> {
        const db = getFirebaseDb();

        // Get the invite
        const invite = await this.getInvite(companyId, inviteId);
        if (!invite) throw new Error('Invite not found');
        if (invite.status !== 'pending') throw new Error('Invite is no longer valid');
        if (invite.expiresAt < Date.now()) throw new Error('Invite has expired');

        // Add user to team
        const memberRef = doc(db, 'companies', companyId, 'team', userId);
        await setDoc(memberRef, {
            email: invite.email,
            name: userName,
            role: invite.role,
            avatar: userAvatar || null,
            status: 'active',
            joinedAt: Date.now(),
            invitedBy: invite.invitedBy,
        });

        // Update user profile with company association
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            companyId,
            role: invite.role,
            updatedAt: Date.now(),
        });

        // Mark invite as accepted
        const inviteRef = doc(db, 'companies', companyId, 'invites', inviteId);
        await updateDoc(inviteRef, {
            status: 'accepted',
            acceptedAt: Date.now(),
            acceptedBy: userId,
        });
    },

    /**
     * Cancel/revoke an invite
     */
    async cancelInvite(companyId: string, inviteId: string): Promise<void> {
        const db = getFirebaseDb();
        const inviteRef = doc(db, 'companies', companyId, 'invites', inviteId);
        await deleteDoc(inviteRef);
    },

    /**
     * Check if email already has pending invite
     */
    async hasPendingInvite(companyId: string, email: string): Promise<boolean> {
        const invites = await this.getPendingInvites(companyId);
        return invites.some((inv) => inv.email === email.toLowerCase());
    },
};
