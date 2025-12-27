import { Metadata } from 'next';
import TrainingClient from './TrainingClient';

export const metadata: Metadata = {
    title: 'Sales Training Academy | AI Simulations',
    description: 'Master cold calling, discovery, and closing with our AI-powered War Room and Objection Dojo.',
};

export default function TrainingPage() {
    return <TrainingClient />;
}
