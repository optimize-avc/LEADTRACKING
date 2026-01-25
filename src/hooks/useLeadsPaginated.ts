'use client';

/**
 * useLeadsPaginated Hook
 *
 * Cursor-based pagination for leads with SWR caching.
 * Loads 25 leads at a time with infinite scroll support.
 *
 * Best practice 2026: Efficient data loading with optimistic updates
 */

import { useCallback, useEffect } from 'react';
import useSWRInfinite from 'swr/infinite';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    DocumentData,
    Query,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/config';
import { Lead, LeadStatus } from '@/types';
import { useAuth } from '@/components/providers/AuthProvider';

const PAGE_SIZE = 25;

interface UseLeadsPaginatedOptions {
    status?: LeadStatus | 'all';
    assignedTo?: string;
    searchQuery?: string;
}

interface LeadsPage {
    leads: Lead[];
    hasMore: boolean;
    offset: number;
}

/**
 * Fetch a single page of leads using offset pagination
 * (Simpler than cursor-based for SWR compatibility)
 */
async function fetchLeadsPage(
    companyId: string,
    options: UseLeadsPaginatedOptions,
    offset: number
): Promise<LeadsPage> {
    const db = getFirebaseDb();
    const leadsRef = collection(db, 'leads');

    // Build query constraints
    const constraints: Parameters<typeof query>[1][] = [
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE + 1), // Get one extra to check if there's more
    ];

    // Filter by status
    if (options.status && options.status !== 'all') {
        constraints.splice(1, 0, where('status', '==', options.status));
    }

    // Filter by assigned user
    if (options.assignedTo) {
        constraints.splice(1, 0, where('assignedTo', '==', options.assignedTo));
    }

    const q = query(leadsRef, ...constraints) as Query<DocumentData>;
    const snapshot = await getDocs(q);

    const docs = snapshot.docs;

    // Apply offset (client-side for simplicity with SWR)
    const startIdx = offset;
    const slicedDocs = docs.slice(startIdx, startIdx + PAGE_SIZE + 1);

    const hasMore = slicedDocs.length > PAGE_SIZE;
    const leads = slicedDocs.slice(0, PAGE_SIZE).map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Lead[];

    // Client-side search filtering (Firestore doesn't support full-text search)
    let filteredLeads = leads;
    if (options.searchQuery) {
        const searchLower = options.searchQuery.toLowerCase();
        filteredLeads = leads.filter(
            (lead) =>
                lead.contactName?.toLowerCase().includes(searchLower) ||
                lead.companyName?.toLowerCase().includes(searchLower) ||
                lead.email?.toLowerCase().includes(searchLower)
        );
    }

    return {
        leads: filteredLeads,
        hasMore,
        offset,
    };
}

/**
 * Hook for paginated leads with SWR caching
 */
export function useLeadsPaginated(options: UseLeadsPaginatedOptions = {}) {
    const { profile } = useAuth();

    // Create a stable filter key for cache invalidation
    const filterKey = `${options.status || 'all'}-${options.assignedTo || 'all'}-${options.searchQuery || ''}`;

    // Generate cache key
    const getKey = (pageIndex: number, previousPageData: LeadsPage | null) => {
        // No company ID yet
        if (!profile?.companyId) return null;

        // Reached the end
        if (previousPageData && !previousPageData.hasMore) return null;

        // Return cache key as array (filter key included for cache invalidation)
        return ['leads', profile.companyId, filterKey, pageIndex];
    };

    // Fetcher function
    const fetcher = async (key: string[]) => {
        const [, companyId, , pageIndexStr] = key;
        const pageIndex = parseInt(pageIndexStr, 10);
        const offset = pageIndex * PAGE_SIZE;

        return fetchLeadsPage(
            companyId,
            {
                status: options.status === 'all' ? undefined : options.status,
                assignedTo: options.assignedTo,
                searchQuery: options.searchQuery || undefined,
            },
            offset
        );
    };

    const { data, error, size, setSize, isLoading, isValidating, mutate } = useSWRInfinite(
        getKey,
        fetcher,
        {
            revalidateFirstPage: false,
            revalidateOnFocus: false,
            dedupingInterval: 5000,
        }
    );

    // Flatten all pages into a single leads array
    const leads = data?.flatMap((page) => page.leads) ?? [];
    const hasMore = data?.[data.length - 1]?.hasMore ?? false;
    const isEmpty = data?.[0]?.leads.length === 0;

    // Load more function
    const loadMore = useCallback(() => {
        if (!isValidating && hasMore) {
            setSize(size + 1);
        }
    }, [hasMore, isValidating, setSize, size]);

    return {
        leads,
        isLoading,
        isValidating,
        error,
        hasMore,
        isEmpty,
        loadMore,
        refresh: mutate,
        totalLoaded: leads.length,
    };
}

/**
 * Infinite scroll hook
 */
export function useInfiniteScroll(loadMore: () => void, hasMore: boolean, isLoading: boolean) {
    useEffect(() => {
        const handleScroll = () => {
            if (isLoading || !hasMore) return;

            const scrollPosition = window.innerHeight + window.scrollY;
            const threshold = document.documentElement.scrollHeight - 200;

            if (scrollPosition >= threshold) {
                loadMore();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [loadMore, hasMore, isLoading]);
}
