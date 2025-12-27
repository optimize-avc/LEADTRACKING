'use client';

import React, { createContext, useContext, useState } from 'react';
import { Course } from '@/types/learning';
import { COURSES as MOCK_COURSES } from '@/lib/mock-data/courses';

interface AIContextType {
    courses: Course[];
    addCourse: (course: Course) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIContextProvider({ children }: { children: React.ReactNode }) {
    // Initialize with mock courses, but allow adding new ones
    const [courses, setCourses] = useState<Course[]>(MOCK_COURSES);

    const addCourse = (course: Course) => {
        setCourses(prev => [course, ...prev]);
    };

    return (
        <AIContext.Provider value={{ courses, addCourse }}>
            {children}
        </AIContext.Provider>
    );
}

export function useAI() {
    const context = useContext(AIContext);
    if (context === undefined) {
        throw new Error('useAI must be used within an AIContextProvider');
    }
    return context;
}
