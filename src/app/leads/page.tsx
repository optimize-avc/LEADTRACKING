import { Metadata } from 'next';
import LeadsClient from './LeadsClient';

export const metadata: Metadata = {
    title: 'Leads & Pipeline Navigation',
    description:
        'Manage your sales pipeline, track lead activity, and close more deals with AI-powered insights.',
};

export default function LeadsPage() {
    return <LeadsClient />;
}
