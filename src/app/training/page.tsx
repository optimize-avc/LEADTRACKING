'use client';

import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Play, CheckCircle, Clock, BookOpen, Video, FileText, Award, ChevronRight } from 'lucide-react';

interface TrainingModule {
    id: string;
    title: string;
    description: string;
    duration: string;
    type: 'video' | 'quiz' | 'reading';
    completed: boolean;
    progress: number;
}

interface TrainingCourse {
    id: string;
    title: string;
    category: string;
    modules: TrainingModule[];
    totalDuration: string;
}

const TRAINING_COURSES: TrainingCourse[] = [
    {
        id: '1',
        title: 'Cold Calling Mastery',
        category: 'Prospecting',
        totalDuration: '2h 15m',
        modules: [
            { id: '1-1', title: 'The Psychology of Cold Calls', description: 'Understand buyer mindset', duration: '15m', type: 'video', completed: true, progress: 100 },
            { id: '1-2', title: 'Opening Lines That Work', description: 'First 10-second strategies', duration: '20m', type: 'video', completed: true, progress: 100 },
            { id: '1-3', title: 'Handling Gatekeepers', description: 'Navigate to decision makers', duration: '25m', type: 'video', completed: false, progress: 60 },
            { id: '1-4', title: 'Objection Handling', description: 'Turn no into next step', duration: '30m', type: 'video', completed: false, progress: 0 },
            { id: '1-5', title: 'Cold Calling Quiz', description: 'Test your knowledge', duration: '10m', type: 'quiz', completed: false, progress: 0 },
        ],
    },
    {
        id: '2',
        title: 'Discovery Call Framework',
        category: 'Sales Process',
        totalDuration: '1h 45m',
        modules: [
            { id: '2-1', title: 'Setting the Agenda', description: 'Control the conversation', duration: '15m', type: 'video', completed: true, progress: 100 },
            { id: '2-2', title: 'SPIN Questioning', description: 'Advanced questioning techniques', duration: '25m', type: 'video', completed: false, progress: 30 },
            { id: '2-3', title: 'Pain Point Discovery', description: 'Uncover true needs', duration: '20m', type: 'reading', completed: false, progress: 0 },
            { id: '2-4', title: 'Next Steps & Close', description: 'Always advance', duration: '20m', type: 'video', completed: false, progress: 0 },
        ],
    },
    {
        id: '3',
        title: 'Product Knowledge',
        category: 'Product',
        totalDuration: '3h 00m',
        modules: [
            { id: '3-1', title: 'Platform Overview', description: 'Core features and benefits', duration: '30m', type: 'video', completed: true, progress: 100 },
            { id: '3-2', title: 'Use Cases by Industry', description: 'Tailored value propositions', duration: '45m', type: 'reading', completed: true, progress: 100 },
            { id: '3-3', title: 'Competitive Positioning', description: 'Win against competitors', duration: '30m', type: 'video', completed: false, progress: 0 },
            { id: '3-4', title: 'Pricing & Packaging', description: 'Navigate deal structures', duration: '20m', type: 'video', completed: false, progress: 0 },
            { id: '3-5', title: 'Product Certification', description: 'Earn your badge', duration: '30m', type: 'quiz', completed: false, progress: 0 },
        ],
    },
];

export default function TrainingPage() {
    const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(null);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'video': return <Video className="w-4 h-4" />;
            case 'quiz': return <Award className="w-4 h-4" />;
            case 'reading': return <FileText className="w-4 h-4" />;
            default: return <BookOpen className="w-4 h-4" />;
        }
    };

    const getCourseProgress = (course: TrainingCourse) => {
        const totalProgress = course.modules.reduce((sum, m) => sum + m.progress, 0);
        return Math.round(totalProgress / course.modules.length);
    };

    return (
        <div className="p-8 min-h-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">
                    Sales Training Academy
                </h1>
                <p className="text-slate-500 text-sm mt-1">Level up your skills with guided learning paths</p>
            </header>

            {/* Progress Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <GlassCard>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-500/20 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">5</p>
                            <p className="text-sm text-slate-400">Modules Completed</p>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                            <Clock className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">4h 30m</p>
                            <p className="text-sm text-slate-400">Total Learning Time</p>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/20 rounded-lg">
                            <Award className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">1</p>
                            <p className="text-sm text-slate-400">Certifications Earned</p>
                        </div>
                    </div>
                </GlassCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Course List */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-lg font-semibold text-white mb-4">Learning Paths</h2>
                    {TRAINING_COURSES.map((course) => {
                        const progress = getCourseProgress(course);
                        return (
                            <GlassCard
                                key={course.id}
                                className={`cursor-pointer transition-all ${selectedCourse?.id === course.id ? 'ring-2 ring-blue-500' : 'hover:bg-white/5'}`}
                                onClick={() => setSelectedCourse(course)}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-medium text-white">{course.title}</h3>
                                        <p className="text-xs text-slate-500">{course.category} • {course.totalDuration}</p>
                                    </div>
                                    <Badge variant={progress === 100 ? 'success' : progress > 0 ? 'warning' : 'default'}>
                                        {progress}%
                                    </Badge>
                                </div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </GlassCard>
                        );
                    })}
                </div>

                {/* Course Content */}
                <div className="lg:col-span-2">
                    {selectedCourse ? (
                        <GlassCard>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white">{selectedCourse.title}</h2>
                                    <p className="text-sm text-slate-400">{selectedCourse.modules.length} modules • {selectedCourse.totalDuration}</p>
                                </div>
                                <button className="glass-button flex items-center gap-2">
                                    <Play className="w-4 h-4" /> Continue
                                </button>
                            </div>

                            <div className="space-y-3">
                                {selectedCourse.modules.map((module, index) => (
                                    <div
                                        key={module.id}
                                        className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${module.completed ? 'bg-green-500/10' : 'bg-slate-800/50 hover:bg-slate-800'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${module.completed ? 'bg-green-500/20 text-green-400' :
                                                module.progress > 0 ? 'bg-blue-500/20 text-blue-400' :
                                                    'bg-slate-700 text-slate-400'
                                            }`}>
                                            {module.completed ? <CheckCircle className="w-4 h-4" /> : index + 1}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-medium text-white truncate">{module.title}</h4>
                                                <span className="text-slate-500">{getTypeIcon(module.type)}</span>
                                            </div>
                                            <p className="text-xs text-slate-500">{module.description} • {module.duration}</p>
                                            {module.progress > 0 && module.progress < 100 && (
                                                <div className="h-1 bg-slate-700 rounded-full mt-2 overflow-hidden w-32">
                                                    <div className="h-full bg-blue-500" style={{ width: `${module.progress}%` }} />
                                                </div>
                                            )}
                                        </div>

                                        <ChevronRight className="w-5 h-5 text-slate-500" />
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    ) : (
                        <GlassCard className="flex items-center justify-center min-h-[400px]">
                            <div className="text-center">
                                <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                <p className="text-slate-500">Select a course to view modules</p>
                            </div>
                        </GlassCard>
                    )}
                </div>
            </div>
        </div>
    );
}
