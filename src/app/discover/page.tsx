import { Metadata } from 'next';
import DiscoverClient from './DiscoverClient';

export const metadata: Metadata = {
    title: 'Business Intelligence Discovery',
    description:
        'Deep-audit any business with AI-powered insights, digital presence analysis, and lead enrichment.',
};

export default function DiscoverPage() {
    return <DiscoverClient />;
}
