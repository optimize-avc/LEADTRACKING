import { Metadata } from 'next';
import TwilioSettingsClient from './TwilioSettingsClient';

export const metadata: Metadata = {
    title: 'Twilio Integration | Settings | SalesTracker AI',
    description: 'Connect your Twilio account for calling and SMS features',
};

export default function TwilioSettingsPage() {
    return <TwilioSettingsClient />;
}
