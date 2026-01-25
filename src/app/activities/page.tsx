import { Metadata } from 'next';
import ActivitiesClient from './ActivitiesClient';

// Prevent static prerendering - this page needs authentication
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Activity Center | Log & Track Performance',
    description:
        'Log your calls, emails, and meetings. Track your progress against daily targets and stay organized.',
};

export default function ActivitiesPage() {
    return <ActivitiesClient />;
}
