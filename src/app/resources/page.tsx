import { Metadata } from 'next';
import ResourcesClient from './ResourcesClient';

export const metadata: Metadata = {
    title: 'Sales Playbooks & Enablement Hub',
    description: 'Access the company knowledge base, sales scripts, battle cards, and training materials.',
};

export default function ResourcesPage() {
    return <ResourcesClient />;
}
