import { Course } from '@/types/learning';

export const COURSES: Course[] = [
    {
        id: 'advanced-negotiation',
        title: 'Advanced Negotiation Mastery',
        description: 'Learn the psychological triggers that close 7-figure deals. This module covers mirroring, labeling, and the rules of compromise.',
        author: 'Chris Voss (AI)',
        duration: '4h 30m',
        level: 'Advanced',
        totalXp: 1500,
        tags: ['Sales', 'Psychology', 'Closing'],
        modules: [
            {
                id: 'mod-1',
                title: 'Module 1: Tactical Empathy',
                description: 'Understanding the other side is your most powerful weapon.',
                lessons: [
                    {
                        id: 'les-1',
                        title: 'The Power of Mirroring',
                        type: 'slide',
                        duration: '10 min',
                        content: {
                            slides: [
                                {
                                    id: 's1',
                                    title: 'What is Tactical Empathy?',
                                    body: 'Tactical empathy is not about being nice. It is about understanding what the other person is feeling and thinking at that moment.',
                                    bullets: [
                                        'It brings you attention.',
                                        'It encourages collaboration.',
                                        'It gets you past the "No".'
                                    ],
                                    imageUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=1000&q=80'
                                },
                                {
                                    id: 's2',
                                    title: 'The Rules of Mirroring',
                                    body: 'Mirroring is the art of insinuating similarity, which facilitates bonding. Usually, it is repeating the last 3 words (or the critical 1-3 words) of what someone has just said.',
                                    bullets: [
                                        'Use a "Late Night FM DJ Voice".',
                                        'Start with "I am sorry..."',
                                        'Repeat the crux of the speech.',
                                        'Silence. Let it sit.'
                                    ]
                                },
                                {
                                    id: 's3',
                                    title: 'Example Scenario',
                                    body: '**Client:** "We just can\'t do that price."\n\n**You:** "Can\'t do that price?"\n\n**Client:** "No, our budget is locked until Q3."\n\n**You:** "Locked until Q3?"',
                                    imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1000&q=80'
                                }
                            ]
                        }
                    },
                    {
                        id: 'les-2',
                        title: 'Labeling Negatives',
                        type: 'quiz',
                        duration: '5 min',
                        content: {
                            passingScore: 70,
                            questions: [
                                {
                                    id: 'q1',
                                    question: 'What is the primary goal of mirroring?',
                                    options: [
                                        'To annoy the opponent',
                                        'To show you are listening and encourage them to talk more',
                                        'To prove you are smarter',
                                        'To change the subject'
                                    ],
                                    correctOptionIndex: 1,
                                    explanation: 'Mirroring encourages the other side to elaborate and reveals more information.'
                                },
                                {
                                    id: 'q2',
                                    question: 'Which tone of voice is recommended for mirroring?',
                                    options: [
                                        'High energy and loud',
                                        'Aggressive and dominant',
                                        'Late Night FM DJ Voice (Calm & Downward)',
                                        'Fast and urgent'
                                    ],
                                    correctOptionIndex: 2,
                                    explanation: 'A calm, downward-inflecting voice signals authority and trustworthiness without triggering defensiveness.'
                                }
                            ]
                        }
                    }
                ]
            },
            {
                id: 'mod-2',
                title: 'Module 2: Accusation Audit',
                description: 'Clear the path before you even start walking.',
                lessons: [
                    {
                        id: 'les-3',
                        title: 'Drafting Your Accusation Audit',
                        type: 'slide',
                        duration: '15 min',
                        content: {
                            slides: [
                                {
                                    id: 's2-1',
                                    title: 'Defusing the Bomb',
                                    body: 'List every terrible thing your counterpart *could* say about you. Say them first.',
                                    bullets: [
                                        '"You are going to think we are expensive."',
                                        '"You will think I am being difficult."',
                                        '"it is going to seem like I do not understand your business."'
                                    ]
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }
];
