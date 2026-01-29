import { Metadata } from 'next';
import SettingsClient from './SettingsClient';
import { PageErrorBoundary } from '@/components/ui/ErrorBoundary';

export const metadata: Metadata = {
    title: 'Workspace Settings | SalesTracker AI',
    description: 'Configure your professional integrations, billing, and account preferences.',
};

export default function SettingsPage() {
    return (
        <PageErrorBoundary>
            <SettingsClient />
        </PageErrorBoundary>
    );
}
