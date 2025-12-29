'use client';

import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { toast } from 'sonner';
import { analytics } from '@/lib/analytics';
import { Badge } from '@/components/ui/Badge';
import {
    Play,
    CheckCircle,
    Clock,
    BookOpen,
    Video,
    FileText,
    Award,
    ChevronRight,
    ShieldAlert,
    Target,
    Mic,
    Zap,
    Users,
} from 'lucide-react';
import { WarRoomRunner } from '@/components/training/WarRoomRunner';
import { DojoRunner } from '@/components/training/DojoRunner';
import { PitchRecorder } from '@/components/training/PitchRecorder';
import { BoardroomRunner } from '@/components/training/BoardroomRunner';

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
            {
                id: '1-1',
                title: 'The Psychology of Cold Calls',
                description: 'Understand buyer mindset',
                duration: '15m',
                type: 'video',
                completed: true,
                progress: 100,
            },
            {
                id: '1-2',
                title: 'Opening Lines That Work',
                description: 'First 10-second strategies',
                duration: '20m',
                type: 'video',
                completed: true,
                progress: 100,
            },
            {
                id: '1-3',
                title: 'Handling Gatekeepers',
                description: 'Navigate to decision makers',
                duration: '25m',
                type: 'video',
                completed: false,
                progress: 60,
            },
            {
                id: '1-4',
                title: 'Objection Handling',
                description: 'Turn no into next step',
                duration: '30m',
                type: 'video',
                completed: false,
                progress: 0,
            },
            {
                id: '1-5',
                title: 'Cold Calling Quiz',
                description: 'Test your knowledge',
                duration: '10m',
                type: 'quiz',
                completed: false,
                progress: 0,
            },
        ],
    },
    {
        id: '2',
        title: 'Discovery Call Framework',
        category: 'Sales Process',
        totalDuration: '1h 45m',
        modules: [
            {
                id: '2-1',
                title: 'Setting the Agenda',
                description: 'Control the conversation',
                duration: '15m',
                type: 'video',
                completed: true,
                progress: 100,
            },
            {
                id: '2-2',
                title: 'SPIN Questioning',
                description: 'Advanced questioning techniques',
                duration: '25m',
                type: 'video',
                completed: false,
                progress: 30,
            },
            {
                id: '2-3',
                title: 'Pain Point Discovery',
                description: 'Uncover true needs',
                duration: '20m',
                type: 'reading',
                completed: false,
                progress: 0,
            },
            {
                id: '2-4',
                title: 'Next Steps & Close',
                description: 'Always advance',
                duration: '20m',
                type: 'video',
                completed: false,
                progress: 0,
            },
        ],
    },
    {
        id: '3',
        title: 'Product Knowledge',
        category: 'Product',
        totalDuration: '3h 00m',
        modules: [
            {
                id: '3-1',
                title: 'Platform Overview',
                description: 'Core features and benefits',
                duration: '30m',
                type: 'video',
                completed: true,
                progress: 100,
            },
            {
                id: '3-2',
                title: 'Use Cases by Industry',
                description: 'Tailored value propositions',
                duration: '45m',
                type: 'reading',
                completed: true,
                progress: 100,
            },
            {
                id: '3-3',
                title: 'Competitive Positioning',
                description: 'Win against competitors',
                duration: '30m',
                type: 'video',
                completed: false,
                progress: 0,
            },
            {
                id: '3-4',
                title: 'Pricing & Packaging',
                description: 'Navigate deal structures',
                duration: '20m',
                type: 'video',
                completed: false,
                progress: 0,
            },
            {
                id: '3-5',
                title: 'Product Certification',
                description: 'Earn your badge',
                duration: '30m',
                type: 'quiz',
                completed: false,
                progress: 0,
            },
        ],
    },
];

type ActiveTool = 'war-room' | 'dojo' | 'pitch' | 'boardroom' | null;

export default function TrainingClient() {
    const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(null);
    const [activeTool, setActiveTool] = useState<ActiveTool>(null);

    const handleToolSelect = (tool: ActiveTool) => {
        setActiveTool(tool);
        if (tool) {
            analytics.track('simulation_started', { tool });
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'video':
                return <Video className="w-4 h-4" />;
            case 'quiz':
                return <Award className="w-4 h-4" />;
            case 'reading':
                return <FileText className="w-4 h-4" />;
            default:
                return <BookOpen className="w-4 h-4" />;
        }
    };

    const getCourseProgress = (course: TrainingCourse) => {
        const totalProgress = course.modules.reduce((sum, m) => sum + m.progress, 0);
        return Math.round(totalProgress / course.modules.length);
    };

    // Training Context State
    const [trainingConfig, setTrainingConfig] = useState<{
        industry: string;
        customerType: string;
    }>({
        industry: 'SaaS Technology',
        customerType: 'Enterprise',
    });

    const [showSettings, setShowSettings] = useState(false);

    const INDUSTRIES = [
        'SaaS Technology',
        'Retail & E-commerce',
        'Healthcare & MedTech',
        'Finance & Banking',
        'Manufacturing & Logistics',
        'Real Estate',
    ];

    const CUSTOMER_TYPES = ['Enterprise', 'Mid-Market', 'SMB', 'Government'];

    // Render Active Tool Modal/Overlay
    if (activeTool === 'war-room') {
        return (
            <WarRoomRunner
                onClose={() => setActiveTool(null)}
                initialContext={{
                    company: 'Target Corp',
                    industry: trainingConfig.industry,
                    value: '$100k',
                    stage: 'Discovery',
                }}
            />
        );
    }
    if (activeTool === 'dojo') {
        return <DojoRunner onClose={() => setActiveTool(null)} config={trainingConfig} />;
    }
    if (activeTool === 'pitch') {
        return <PitchRecorder onClose={() => setActiveTool(null)} config={trainingConfig} />;
    }
    if (activeTool === 'boardroom') {
        return <BoardroomRunner onClose={() => setActiveTool(null)} config={trainingConfig} />;
    }

    return (
        <div className="p-4 md:p-8 min-h-screen">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">
                        Sales Training Academy
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Level up your skills with guided learning paths and AI tools
                    </p>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors border border-slate-700"
                    >
                        <Target className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm">
                            Target:{' '}
                            <span className="text-white font-medium">
                                {trainingConfig.industry}
                            </span>{' '}
                            ({trainingConfig.customerType})
                        </span>
                    </button>

                    {showSettings && (
                        <div className="absolute top-full right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 z-50">
                            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4 text-indigo-400" />
                                Simulation Context
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">
                                        Target Industry
                                    </label>
                                    <select
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={trainingConfig.industry}
                                        onChange={(e) =>
                                            setTrainingConfig((prev) => ({
                                                ...prev,
                                                industry: e.target.value,
                                            }))
                                        }
                                    >
                                        {INDUSTRIES.map((ind) => (
                                            <option key={ind} value={ind}>
                                                {ind}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">
                                        Customer Type
                                    </label>
                                    <select
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={trainingConfig.customerType}
                                        onChange={(e) =>
                                            setTrainingConfig((prev) => ({
                                                ...prev,
                                                customerType: e.target.value,
                                            }))
                                        }
                                    >
                                        {CUSTOMER_TYPES.map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* AI Training Tools Section */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    AI Training Tools
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <GlassCard
                        className="cursor-pointer hover:bg-white/5 transition-all group border-l-4 border-l-red-500"
                        onClick={() => handleToolSelect('war-room')}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-red-500/20 rounded-lg group-hover:bg-red-500/30 transition-colors">
                                <ShieldAlert className="w-6 h-6 text-red-400" />
                            </div>
                            <Badge variant="warning">Hard Mode</Badge>
                        </div>
                        <h3 className="font-bold text-lg text-white mb-1">The War Room</h3>
                        <p className="text-sm text-slate-400">
                            Simulate high-stakes deal negotiations with an aggressive AI buyer.
                        </p>
                    </GlassCard>

                    <GlassCard
                        className="cursor-pointer hover:bg-white/5 transition-all group border-l-4 border-l-blue-500"
                        onClick={() => handleToolSelect('dojo')}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                                <Target className="w-6 h-6 text-blue-400" />
                            </div>
                            <Badge variant="default">Practice</Badge>
                        </div>
                        <h3 className="font-bold text-lg text-white mb-1">Objection Dojo</h3>
                        <p className="text-sm text-slate-400">
                            Master common objections with rapid-fire repetition and feedback.
                        </p>
                    </GlassCard>

                    <GlassCard
                        className="cursor-pointer hover:bg-white/5 transition-all group border-l-4 border-l-purple-500"
                        onClick={() => handleToolSelect('pitch')}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                                <Mic className="w-6 h-6 text-purple-400" />
                            </div>
                            <Badge variant="default">Analysis</Badge>
                        </div>
                        <h3 className="font-bold text-lg text-white mb-1">Pitch Recorder</h3>
                        <p className="text-sm text-slate-400">
                            Record your elevator pitch and get instant AI coaching on delivery.
                        </p>
                    </GlassCard>

                    <GlassCard
                        className="cursor-pointer hover:bg-white/5 transition-all group border-l-4 border-l-amber-500"
                        onClick={() => handleToolSelect('boardroom')}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-amber-500/20 rounded-lg group-hover:bg-amber-500/30 transition-colors">
                                <Users className="w-6 h-6 text-amber-400" />
                            </div>
                            <Badge variant="warning">Venture Scale</Badge>
                        </div>
                        <h3 className="font-bold text-lg text-white mb-1">The Boardroom</h3>
                        <p className="text-sm text-slate-400">
                            Multi-agent simulation. Win over the CFO, CTO, and Champion
                            simultaneously.
                        </p>
                    </GlassCard>
                </div>
            </div>

            {/* Progress Overview */}
            <h2 className="text-lg font-semibold text-white mb-4">Your Progress</h2>
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
                                        <p className="text-xs text-slate-500">
                                            {course.category} • {course.totalDuration}
                                        </p>
                                    </div>
                                    <Badge
                                        variant={
                                            progress === 100
                                                ? 'success'
                                                : progress > 0
                                                  ? 'warning'
                                                  : 'default'
                                        }
                                    >
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
                                    <h2 className="text-xl font-bold text-white">
                                        {selectedCourse.title}
                                    </h2>
                                    <p className="text-sm text-slate-400">
                                        {selectedCourse.modules.length} modules •{' '}
                                        {selectedCourse.totalDuration}
                                    </p>
                                </div>
                                <button className="glass-button flex items-center gap-2">
                                    <Play className="w-4 h-4" /> Continue
                                </button>
                            </div>

                            <div className="space-y-3">
                                {selectedCourse.modules.map((module, index) => (
                                    <div
                                        key={module.id}
                                        className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                                            module.completed
                                                ? 'bg-green-500/10'
                                                : 'bg-slate-800/50 hover:bg-slate-800'
                                        }`}
                                    >
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                module.completed
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : module.progress > 0
                                                      ? 'bg-blue-500/20 text-blue-400'
                                                      : 'bg-slate-700 text-slate-400'
                                            }`}
                                        >
                                            {module.completed ? (
                                                <CheckCircle className="w-4 h-4" />
                                            ) : (
                                                index + 1
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-medium text-white truncate">
                                                    {module.title}
                                                </h4>
                                                <span className="text-slate-500">
                                                    {getTypeIcon(module.type)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                {module.description} • {module.duration}
                                            </p>
                                            {module.progress > 0 && module.progress < 100 && (
                                                <div className="h-1 bg-slate-700 rounded-full mt-2 overflow-hidden w-32">
                                                    <div
                                                        className="h-full bg-blue-500"
                                                        style={{ width: `${module.progress}%` }}
                                                    />
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
