'use client';

import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Resource, ResourceCategory } from '@/types';
import { MOCK_RESOURCES } from '@/lib/mock-data/resources';
import { Search, FileText, Video, Link as LinkIcon, Download, FileSpreadsheet, Presentation } from 'lucide-react';

const CATEGORIES: ResourceCategory[] = [
    'Playbook', 'Learning', 'Prospecting', 'Templates',
    'Competitive', 'Operational', 'Scheduling', 'Brand', 'Insights'
];

export default function ResourcesPage() {
    const [activeCategory, setActiveCategory] = useState<ResourceCategory | 'All'>('All');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredResources = MOCK_RESOURCES.filter(resource => {
        const matchesCategory = activeCategory === 'All' || resource.category === activeCategory;
        const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            resource.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'video': return <Video className="w-5 h-5 text-red-400" />;
            case 'deck': return <Presentation className="w-5 h-5 text-orange-400" />;
            case 'sheet': return <FileSpreadsheet className="w-5 h-5 text-green-400" />;
            case 'link': return <LinkIcon className="w-5 h-5 text-blue-400" />;
            default: return <FileText className="w-5 h-5 text-slate-300" />;
        }
    };

    return (
        <div className="flex h-screen bg-[#0b1121]">
            {/* Category Sidebar */}
            <aside className="w-64 border-r border-slate-800 p-6 flex-shrink-0">
                <h2 className="text-xl font-bold text-white mb-6 px-2">Knowledge Hub</h2>
                <div className="space-y-1">
                    <button
                        onClick={() => setActiveCategory('All')}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeCategory === 'All' ? 'bg-blue-600/20 text-blue-300' : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        All Resources
                    </button>

                    <div className="my-4 border-t border-slate-800" />

                    {CATEGORIES.map(category => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeCategory === category ? 'bg-blue-600/20 text-blue-300' : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400 mb-2">
                        Enablement & Resources
                    </h1>
                    <p className="text-slate-400 mb-6">Access all sales materials, training, and operational tools.</p>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search guides, scripts, videos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="glass-input pl-10 h-12 text-lg"
                        />
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredResources.map(resource => (
                        <GlassCard key={resource.id} className="group hover:bg-slate-800/60 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors">
                                    {getIcon(resource.type)}
                                </div>
                                <Badge variant="default">{resource.category}</Badge>
                            </div>

                            <h3 className="font-semibold text-lg text-white mb-2 group-hover:text-blue-300 transition-colors">
                                {resource.title}
                            </h3>
                            <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                                {resource.description}
                            </p>

                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-700/50">
                                <span className="text-xs text-slate-500">
                                    {new Date(resource.updatedAt).toLocaleDateString()}
                                </span>
                                <button className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1">
                                    Access <Download className="w-3 h-3" />
                                </button>
                            </div>
                        </GlassCard>
                    ))}
                </div>

                {filteredResources.length === 0 && (
                    <div className="text-center py-20 text-slate-500">
                        <p>No resources found matching your search.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
