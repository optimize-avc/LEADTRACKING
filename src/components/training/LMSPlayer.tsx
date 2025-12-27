'use client';

import React, { useState } from 'react';
import { Course, Module, Lesson } from '@/types/learning';
import { X, ChevronLeft, Layout, CheckCircle, Lock } from 'lucide-react';
import { SlideDeck } from './SlideDeck';
import { QuizComponent } from './QuizComponent';
import { SlideContent, QuizContent } from '@/types/learning';
import confetti from 'canvas-confetti';

interface LMSPlayerProps {
    course: Course;
    onClose: () => void;
}

export function LMSPlayer({ course, onClose }: LMSPlayerProps) {
    // Flatten lessons for simpler navigation logic for this MVP
    // In a real app, we'd handle module boundaries more strictly
    const allLessons = course.modules.flatMap(m => m.lessons);

    const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
    const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const currentLesson = allLessons[currentLessonIndex];
    const currentModule = course.modules.find(m => m.lessons.some(l => l.id === currentLesson.id));

    const handleLessonComplete = () => {
        const newCompleted = new Set(completedLessons);
        newCompleted.add(currentLesson.id);
        setCompletedLessons(newCompleted);

        // Auto-advance if not last
        if (currentLessonIndex < allLessons.length - 1) {
            setTimeout(() => {
                setCurrentLessonIndex(prev => prev + 1);
            }, 1000);
        } else {
            // Course Complete!
            confetti({
                particleCount: 200,
                spread: 100,
                origin: { y: 0.6 }
            });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#0b1121] text-white flex flex-col md:flex-row animate-fade-in">

            {/* Sidebar (Lesson Navigation) */}
            <aside
                className={`
                    bg-slate-900 border-r border-white/5 flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out relative
                    ${isSidebarOpen ? 'w-full md:w-80 h-[30vh] md:h-full opacity-100' : 'w-0 h-0 md:h-full opacity-0 overflow-hidden border-none'}
                `}
            >
                <div className="p-4 border-b border-white/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors flex-shrink-0">
                            <X size={20} />
                        </button>
                        <h1 className="font-bold text-sm truncate whitespace-nowrap" title={course.title}>{course.title}</h1>
                    </div>
                    {/* Unique Close Sidebar Button */}
                    <button onClick={toggleSidebar} className="p-2 text-slate-400 hover:text-white md:hidden">
                        <Layout size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar whitespace-nowrap">
                    {course.modules.map((module) => (
                        <div key={module.id}>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
                                {module.title}
                            </h3>
                            <div className="space-y-1">
                                {module.lessons.map((lesson, idx) => {
                                    // Calculate global index for active state
                                    const globalIdx = allLessons.findIndex(l => l.id === lesson.id);
                                    const isActive = globalIdx === currentLessonIndex;
                                    const isCompleted = completedLessons.has(lesson.id);
                                    const isLocked = globalIdx > 0 && !completedLessons.has(allLessons[globalIdx - 1].id) && !isActive && !isCompleted;

                                    return (
                                        <button
                                            key={lesson.id}
                                            onClick={() => !isLocked && setCurrentLessonIndex(globalIdx)}
                                            disabled={isLocked}
                                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all text-left
                                                ${isActive ? 'bg-indigo-600/10 text-indigo-300 border border-indigo-500/20' : 'text-slate-400 hover:bg-white/5'}
                                                ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
                                            `}
                                        >
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold border
                                                ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' :
                                                    isActive ? 'border-indigo-500 text-indigo-400' : 'border-slate-700 text-slate-600'}
                                            `}>
                                                {isCompleted ? <CheckCircle size={12} className="fill-emerald-500 text-white" /> : (idx + 1)}
                                            </div>
                                            <span className="truncate flex-1">{lesson.title}</span>
                                            {isLocked && <Lock size={12} className="text-slate-600" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Progress Footer */}
                <div className="p-4 border-t border-white/5 bg-slate-950/30">
                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                        <span>Course Progress</span>
                        <span>{Math.round((completedLessons.size / allLessons.length) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(completedLessons.size / allLessons.length) * 100}%` }} />
                    </div>
                </div>
            </aside>

            {/* Main Content Player */}
            <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-950">
                {/* Top Bar for Context */}
                <div className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-slate-900/50 backdrop-blur-md">
                    <div className="flex items-center gap-4 text-slate-400 text-sm overflow-hidden">
                        <button
                            onClick={toggleSidebar}
                            className="p-2 -ml-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                            title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                        >
                            <Layout size={20} className={isSidebarOpen ? "text-indigo-400" : ""} />
                        </button>

                        <div className="flex items-center gap-2 truncate">
                            <span className="hidden md:inline">{currentModule?.title}</span>
                            <span className="text-slate-600 hidden md:inline">/</span>
                            <span className="text-white font-medium truncate">{currentLesson.title}</span>
                        </div>
                    </div>

                    {/* Close Course Button (Visible when sidebar is closed) */}
                    {!isSidebarOpen && (
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Content Render Area */}
                <div className="flex-1 overflow-y-auto no-scrollbar relative">
                    {currentLesson.type === 'slide' && (
                        <SlideDeck
                            key={currentLesson.id} // Force remount on change
                            slides={(currentLesson.content as SlideContent).slides}
                            onComplete={handleLessonComplete}
                        />
                    )}

                    {currentLesson.type === 'quiz' && (
                        <QuizComponent
                            key={currentLesson.id}
                            content={currentLesson.content as QuizContent}
                            onComplete={(score) => {
                                handleLessonComplete();
                            }}
                        />
                    )}

                    {currentLesson.type === 'video' && (
                        <div className="flex items-center justify-center h-full text-slate-500">
                            Video Player Implementation Pending...
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
