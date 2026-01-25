import { Metadata } from 'next';
import AdminClient from './AdminClient';

// Force dynamic rendering - this page has authentication and event handlers
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Admin Dashboard | SalesTracker AI',
    description: 'Platform-wide metrics and analytics for administrators',
};

export default function AdminPage() {
    return <AdminClient />;
}
