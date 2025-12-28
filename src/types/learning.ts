export type ContentType = 'video' | 'slide' | 'quiz' | 'external';

export interface Course {
    id: string;
    title: string;
    description: string;
    author: string;
    duration: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    thumbnailUrl?: string;
    modules: Module[];
    totalXp: number;
    tags: string[];
    generatedFromId?: string; // ID of the resource this was generated from
}

export interface Module {
    id: string;
    title: string;
    description: string;
    lessons: Lesson[];
}

export interface Lesson {
    id: string;
    title: string;
    type: ContentType;
    duration: string; // e.g. "5 min"
    content: VideoContent | SlideContent | QuizContent | ExternalContent;
    isCompleted?: boolean; // Runtime state
    isLocked?: boolean; // Runtime state
}

export interface VideoContent {
    videoUrl: string;
    transcript?: string;
}

export interface SlideContent {
    slides: Slide[];
}

export interface Slide {
    id: string;
    title: string;
    body: string; // Markdown supported
    imageUrl?: string;
    bullets?: string[];
}

export interface QuizContent {
    questions: QuizQuestion[];
    passingScore: number; // Percentage 0-100
}

export interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    correctOptionIndex: number;
    explanation?: string; // Shown after answering
}

export type Question = QuizQuestion;

export interface ExternalContent {
    url: string;
    label: string;
}
