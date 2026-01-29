import { Metadata } from 'next';
import AnalyticsClient from './AnalyticsClient';
import { PageErrorBoundary } from '@/components/ui/ErrorBoundary';

export const metadata: Metadata = {
    title: 'Sales Performance Analytics',
    description:
        'Track your dials, connects, and revenue targets with real-time performance analytics and leaderboard.',
};

export default function AnalyticsPage() {
    return (
        <PageErrorBoundary>
            <AnalyticsClient />
        </PageErrorBoundary>
    );
}
