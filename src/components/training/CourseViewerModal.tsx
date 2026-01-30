'use client';

import React, { useEffect, useCallback } from 'react';
import { X, PlayCircle, Lock } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface CourseViewerModalProps {
    course: { title: string; author: string } | null;
    onClose: () => void;
}

export function CourseViewerModal({ course, onClose }: CourseViewerModalProps) {
    const { containerRef } = useFocusTrap(!!course);

    // Handle Escape key
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        },
        [onClose]
    );

    useEffect(() => {
        if (course) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [course, handleKeyDown]);

    if (!course) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-viewer-title"
        >
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                ref={containerRef}
                className="glass-panel w-full max-w-4xl relative z-10 animate-fade-in-up bg-slate-900 border border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5">
                    <div>
                        <h2 id="course-viewer-title" className="text-xl font-bold text-white">
                            {course.title}
                        </h2>
                        <p className="text-sm text-slate-400">By {course.author}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                        aria-label="Close course viewer"
                    >
                        <X size={24} aria-hidden="true" />
                    </button>
                </div>

                {/* Content Area (Placeholder for Video) */}
                <div
                    className="flex-1 bg-black relative aspect-video flex-shrink-0 min-h-[300px] flex items-center justify-center group overflow-hidden"
                    role="region"
                    aria-label="Video player"
                >
                    <div
                        className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity"
                        aria-hidden="true"
                    ></div>

                    {/* Placeholder Play Button */}
                    <div className="relative z-20 text-center">
                        <button
                            className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform cursor-pointer shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                            aria-label="Play video"
                        >
                            <PlayCircle
                                size={40}
                                className="text-white fill-white/20"
                                aria-hidden="true"
                            />
                        </button>
                        <p className="text-slate-300 font-medium">Video Player Placeholder</p>
                        <p className="text-xs text-slate-500 mt-1">No video URL provided yet.</p>
                    </div>

                    {/* Progress Bar (Fake) */}
                    <div
                        className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 z-30"
                        role="progressbar"
                        aria-valuenow={33}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Video progress"
                    >
                        <div className="h-full bg-blue-500 w-1/3"></div>
                    </div>
                </div>

                {/* Description / Resources */}
                <div className="p-8 overflow-y-auto">
                    <h3 className="font-bold text-white mb-3">Module Overview</h3>
                    <p className="text-slate-400 leading-relaxed mb-6">
                        In this module, we dive deep into the strategies that separate top
                        performers from the rest. You will learn actionable techniques to improve
                        your pipeline velocity and close rates.
                    </p>

                    <div
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        role="list"
                        aria-label="Course resources"
                    >
                        <button
                            className="p-4 rounded-lg bg-slate-800/50 border border-white/5 flex items-center gap-3 hover:bg-slate-800 transition-colors text-left"
                            role="listitem"
                            aria-label="Download course slides, 12.5 megabytes PDF file"
                        >
                            <div
                                className="w-10 h-10 rounded bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold"
                                aria-hidden="true"
                            >
                                PDF
                            </div>
                            <div>
                                <div className="text-sm font-medium text-white">Course Slides</div>
                                <div className="text-xs text-slate-500">12.5 MB</div>
                            </div>
                        </button>
                        <div
                            className="p-4 rounded-lg bg-slate-800/50 border border-white/5 flex items-center gap-3 opacity-50 cursor-not-allowed"
                            role="listitem"
                            aria-label="Quiz assessment, locked until video is complete"
                        >
                            <div
                                className="w-10 h-10 rounded bg-slate-700/30 flex items-center justify-center text-slate-500 font-bold"
                                aria-hidden="true"
                            >
                                <Lock size={16} />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-slate-400">
                                    Quiz: Assessment
                                </div>
                                <div className="text-xs text-slate-600">
                                    Locked - Complete video to unlock
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
