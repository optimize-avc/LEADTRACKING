import { Course, Module, Lesson, Question } from '@/types/learning';
import { Resource } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Simulates an AI Engine that analyzes a document and produces a structured course.
 * In a real V2, this would call OpenAI/Anthropic with a prompt containing the resource content.
 */
export async function generateCourseFromResource(resource: Resource): Promise<Course> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const courseId = uuidv4();

    // Template logic based on resource category
    const isScript =
        resource.category === 'Prospecting' || resource.title.toLowerCase().includes('script');
    const isPlaybook = resource.category === 'Playbook';

    return {
        id: courseId,
        title: `Mastering: ${resource.title}`,
        description: `An interactive deep-dive into the ${resource.title}. Learn the core concepts, study the material, and test your knowledge.`,
        author: 'AI Enablement Engine',
        duration: '25 min',
        level: 'Intermediate',
        totalXp: 500,
        tags: [resource.category, 'AI Generated', 'Enablement'],
        generatedFromId: resource.id,
        modules: [
            // Module 1: Understanding the Core Concept
            {
                id: uuidv4(),
                title: 'Core Concepts',
                description: 'Understanding the fundamental principles.',
                lessons: [
                    {
                        id: uuidv4(),
                        title: 'Introduction & Context',
                        type: 'slide',
                        duration: '5 min',
                        content: {
                            slides: [
                                {
                                    id: uuidv4(),
                                    title: `Why ${resource.title} Matters`,
                                    body: `This resource is a critical part of our ${resource.category} strategy.\n\nMastering this content will help you improve your efficiency and conversion rates.`,
                                    bullets: [
                                        'Understand the "Why" behind the document',
                                        'Learn key terminology',
                                        'Identify best use-cases',
                                    ],
                                },
                                {
                                    id: uuidv4(),
                                    title: 'Key Takeaways',
                                    body: 'Before we dive in, here are the three things you need to remember:',
                                    bullets: [
                                        'Consistency is key',
                                        'Always tailor to the prospect',
                                        'Measure your results',
                                    ],
                                },
                            ],
                        },
                    },
                ],
            },
            // Module 2: The Deep Dive (Script/Playbook specific)
            {
                id: uuidv4(),
                title: 'Tactical Application',
                description: 'How to apply this in the real world.',
                lessons: [
                    {
                        id: uuidv4(),
                        title: isScript ? 'Delivery & Tonality' : 'Execution Steps',
                        type: 'slide',
                        duration: '10 min',
                        content: {
                            slides: [
                                {
                                    id: uuidv4(),
                                    title: isScript
                                        ? 'Perfecting the Delivery'
                                        : 'Step-by-Step Execution',
                                    body: isScript
                                        ? "It's not just what you say, it's how you say it. Focus on:\n\n1. Pace (Not too fast)\n2. Tone (Confident but curious)\n3. Pauses (Let them think)"
                                        : "Follow the playbook exactly to ensure success. Deviation creates variables we can't measure.",
                                    imageUrl: isScript
                                        ? 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=800'
                                        : 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800',
                                },
                            ],
                        },
                    },
                ],
            },
            // Module 3: Knowledge Check
            {
                id: uuidv4(),
                title: 'Certification',
                description: 'Verify your understanding.',
                lessons: [
                    {
                        id: uuidv4(),
                        title: 'Final Assessment',
                        type: 'quiz',
                        duration: '10 min',
                        content: {
                            passingScore: 80,
                            questions: [
                                {
                                    id: uuidv4(),
                                    question: `What is the primary goal of the ${resource.title}?`,
                                    options: [
                                        'To confuse the prospect',
                                        'To drive revenue and efficiency',
                                        'To fill up time',
                                    ],
                                    correctOptionIndex: 1,
                                    explanation:
                                        'All our enablement resources are designed to drive core business metrics like revenue and efficiency.',
                                },
                                {
                                    id: uuidv4(),
                                    question: 'When should you apply these techniques?',
                                    options: [
                                        'Only on Fridays',
                                        'Whenever you feel like it',
                                        'Consistently across all relevant interactions',
                                    ],
                                    correctOptionIndex: 2,
                                    explanation:
                                        'Consistency reduces variables and allows us to optimize performance over time.',
                                },
                            ],
                        },
                    },
                ],
            },
        ],
    };
}

/**
 * Generates a batch of randomized, quality questions for "Endless Mastery" mode.
 */
export async function generateQuizBatch(count: number): Promise<Question[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const questions: Question[] = [];

    // Pool of High-Quality Template Questions (Sales methodology focused)
    // In V2, these would come from the AI analyzing the entire Resource library.
    const questionTemplates = [
        {
            q: "When a prospect says 'I need to think about it', what is the best immediate response?",
            o: [
                "'Okay, call me next week.'",
                "'What specifically do you need to think about?'",
                "'I'll send you an email.'",
                "'Is it the price?'",
            ],
            c: 1,
            e: "Isolating the objection is key. Asking 'What specifically...' forces the prospect to reveal the true blocker (Price, Authority, Timing).",
        },
        {
            q: 'Which metric is the most critical indicator of a healthy sales pipeline?',
            o: [
                'Total number of leads',
                'Deal Velocity',
                'Number of calls made',
                'Email open rate',
            ],
            c: 1,
            e: 'Deal Velocity (how fast a deal moves through stages) is the best predictor of revenue. Stagnant deals, even if numerous, do not close.',
        },
        {
            q: "In the MEDDIC qualification framework, what does the 'E' stand for?",
            o: ['Energy', 'Engagement', 'Economic Buyer', 'Enterprise'],
            c: 2,
            e: 'The Economic Buyer is the person with the ultimate authority to release funds. Identifying them early is crucial.',
        },
        {
            q: "What is the primary purpose of the 'Discovery' phase?",
            o: [
                'To pitch your product features',
                'To qualify the prospect out',
                "To understand the prospect's pain and goals",
                'To build rapport only',
            ],
            c: 2,
            e: "Discovery is about uncovering 'Pain' and 'Goals'. Features should only be discussed as solutions to specific pains found in Discovery.",
        },
        {
            q: 'When conducting a demo, you should...',
            o: [
                'Show every single feature',
                "Focus only on the features that solve the prospect's identified pain",
                'Let the prospect drive the screen',
                'Save the pricing for the very end',
            ],
            c: 1,
            e: 'Feature-dumping kills deals. Only show what solves the specific problems you identified during discovery.',
        },
        {
            q: 'What is the optimal length for a cold email subject line?',
            o: ['1-3 words', '10+ words', 'Full sentence', 'No subject line'],
            c: 0,
            e: "Data shows that short, vague subject lines (e.g., 'Quick question', 'Thoughts?') yield higher open rates than long, descriptive ones.",
        },
        {
            q: "A 'Champion' in a deal is someone who...",
            o: [
                'Signs the contract',
                'Blocks your access',
                'Sells on your behalf internally',
                'Ignores your emails',
            ],
            c: 2,
            e: "A Champion is your internal advocate who sells your solution when you aren't in the room. They have power and influence.",
        },
        {
            q: "If a prospect goes dark after a proposal, effective 'break-up' emails rely on...",
            o: ['Guilt', 'Anger', 'Loss Aversion / Negative Reverse Selling', 'Desperation'],
            c: 2,
            e: "Negative Reverse Selling (e.g., 'Have you given up on this project?') triggers loss aversion and often gets a response.",
        },
        {
            q: 'What is the difference between specific and implied needs?',
            o: [
                'They are the same',
                'Implied is a statement of dissatisfaction; Specific is a statement of desire for a solution',
                'Implied is stronger',
                "Specific needs don't matter",
            ],
            c: 1,
            e: "SPIN Selling teaches that 'Implied needs' (I have a headache) must be developed into 'Specific needs' (I need aspirin) before pitching.",
        },
        {
            q: "The 'Upfront Contract' technique is primarily used to...",
            o: [
                'Force a sale',
                "Set clear expectations for the meeting's agenda and outcome",
                'Trick the prospect',
                'Sign a legal document',
            ],
            c: 1,
            e: "Sandler's Upfront Contract ensures both parties agree on the purpose, time, and possible outcomes (Yes, No, Next Step) of a meeting.",
        },
    ];

    for (let i = 0; i < count; i++) {
        // Randomly select, but try to cycle through them
        const template = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];

        questions.push({
            id: uuidv4(),
            question: template.q,
            options: template.o,
            correctOptionIndex: template.c,
            explanation: template.e,
        });
    }

    return questions;
}
