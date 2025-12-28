import { Metadata } from 'next';
import ActivitiesClient from './ActivitiesClient';

export const metadata: Metadata = {
    title: 'Activity Center | Log & Track Performance',
    description:
        'Log your calls, emails, and meetings. Track your progress against daily targets and stay organized.',
};

export default function ActivitiesPage() {
    return <ActivitiesClient />;
}
