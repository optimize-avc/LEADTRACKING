import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LeadsService } from '@/lib/firebase/services';
import { Lead } from '@/types';
import { useAuth } from '@/components/providers/AuthProvider';

export function useLeads() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: leads = [], isLoading, error } = useQuery({
        queryKey: ['leads', user?.uid],
        queryFn: () => {
            if (!user?.uid) return Promise.resolve([]);
            return LeadsService.getLeads(user.uid);
        },
        enabled: !!user?.uid, // Only fetch if user is logged in
    });

    const addLeadMutation = useMutation({
        mutationFn: (newLead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'assignedTo'>) => {
            if (!user?.uid) throw new Error("User not authenticated");
            return LeadsService.createLead(user.uid, newLead);
        },
        onSuccess: () => {
            // Invalidate to refetch
            queryClient.invalidateQueries({ queryKey: ['leads', user?.uid] });
        }
    });

    return {
        leads,
        isLoading,
        error,
        addLead: addLeadMutation.mutateAsync,
        isAdding: addLeadMutation.isPending
    };
}
