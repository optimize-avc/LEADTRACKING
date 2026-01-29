import { Metadata } from 'next';
import DiscoverClient from './DiscoverClient';
import { PageErrorBoundary } from '@/components/ui/ErrorBoundary';

export const metadata: Metadata = {
    title: 'Business Intelligence Discovery',
    description:
        'Deep-audit any business with AI-powered insights, digital presence analysis, and lead enrichment.',
};

export default function DiscoverPage() {
    return (
        <PageErrorBoundary>
            <DiscoverClient />
        </PageErrorBoundary>
    );
}
