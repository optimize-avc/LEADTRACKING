export type DominanceLevel = 'High' | 'Medium' | 'Low';

export interface AIPersona {
    name: string;
    role: string;
    company: string;
    personality: string;
    painPoints: string[];
    objections: string[];
    hiddenAgenda: string;
}

export interface AIPitchAnalysis {
    score: number;
    pace: number;
    fillerWords: string[];
    confidence: 'High' | 'Medium' | 'Low';
    strengths: string[];
    improvements: string[];
    oneLineFeedback: string;
}

export interface AIStakeholder {
    id: string;
    name: string;
    role: string;
    dominance: DominanceLevel;
    sentiment: number;
    hiddenAgenda: string;
    traits: string[];
}

export interface AIScenario {
    company: string;
    industry: string;
    dealValue: string;
    difficulty: string;
    description: string;
    stakeholders: AIStakeholder[];
}

export interface AITurnResult {
    outcomeTitle: string;
    outcomeDescription: string;
    sentimentDelta: number;
    dealHealthDelta: number;
    newRisk?: string;
    emailResponse?: {
        from: string;
        subject: string;
        body: string;
    };
}

export interface AIBoardroomAgent {
    id: string;
    name: string;
    role: string;
    archetype: 'Blocker' | 'Champion' | 'Decision Maker' | 'Neutral';
    avatar: string;
    dominance: number;
    patience: number;
    hiddenAgenda: string;
}

export interface AIBoardroomScenario {
    company: string;
    stakeholders: AIBoardroomAgent[];
}

export interface AIBoardroomTurnResult {
    mainSpeakerId: string;
    response: string;
    whispers: {
        agentId: string;
        thought: string;
    }[];
    sidebar?: {
        fromId: string;
        toId: string;
        message: string;
    };
}

export interface AIBoardroomTranscriptItem {
    id: string;
    speaker: string;
    speakerId?: string;
    message: string;
    type: 'speech' | 'whisper' | 'sidebar';
    targetId?: string;
}

export type FutureArtifactType = 'news_article' | 'email' | 'slack' | 'stock';

export interface AIFutureArtifact {
    type: FutureArtifactType;
    headline?: string;
    publication?: string;
    date?: string;
    body?: string;
    imageUrl?: string;
    subject?: string;
    from?: string;
    to?: string;
    channel?: string;
    messages?: { user: string; text: string }[];
    ticker?: string;
    price?: string;
    change?: string;
    news?: string;
}
