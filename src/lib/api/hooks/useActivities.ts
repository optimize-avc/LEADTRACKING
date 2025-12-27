import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ActivitiesService } from '@/lib/firebase/services';
import { Activity } from '@/types';
import { useAuth } from '@/components/providers/AuthProvider';

export function useActivities(leadId?: string) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Key includes leadId if provided, otherwise generic user activities
    const queryKey = leadId
        ? ['activities', 'lead', leadId]
        : ['activities', 'user', user?.uid];

    const { data: activities = [], isLoading, error } = useQuery({
        queryKey,
        queryFn: () => {
            if (leadId) {
                return ActivitiesService.getLeadActivities(leadId);
            }
            if (!user?.uid) return Promise.resolve([]);
            return ActivitiesService.getActivities(user.uid);
        },
        enabled: !!user?.uid,
    });

    const logActivityMutation = useMutation({
        mutationFn: (newActivity: Omit<Activity, 'id' | 'timestamp'>) => ActivitiesService.logActivity(newActivity),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            if (leadId) {
                // Also invalidate the generic user feed if we logged a specific lead activity
                queryClient.invalidateQueries({ queryKey: ['activities', 'user', user?.uid] });
            }
        }
    });

    return {
        activities,
        isLoading,
        error,
        logActivity: logActivityMutation.mutateAsync,
        isLogging: logActivityMutation.isPending
    };
}
