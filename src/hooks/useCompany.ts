'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { CompanyService } from '@/lib/firebase/company';
import type { Company } from '@/types/company';

interface UseCompanyResult {
    company: Company | null;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage the current user's company data
 */
export function useCompany(): UseCompanyResult {
    const { user, loading: authLoading } = useAuth();
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchCompany = useCallback(async () => {
        if (!user) {
            setCompany(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const companyData = await CompanyService.getCompanyByUser(user.uid);
            setCompany(companyData);
        } catch (err) {
            console.error('Failed to fetch company:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch company'));
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (authLoading) return;
        fetchCompany();
    }, [authLoading, fetchCompany]);

    const refetch = useCallback(async () => {
        await fetchCompany();
    }, [fetchCompany]);

    return {
        company,
        loading: authLoading || loading,
        error,
        refetch,
    };
}
