'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Resource, ResourceCategory } from '@/types';
import { MOCK_RESOURCES } from '@/lib/mock-data/resources'; // Keep for defaults
import { ResourcesService } from '@/lib/firebase/resources';
import { useAuth } from '@/components/providers/AuthProvider';
import {
    Search,
    FileText,
    Video,
    Link as LinkIcon,
    Download,
    FileSpreadsheet,
    Presentation,
    Plus,
    X,
    UploadCloud,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES: ResourceCategory[] = [
    'Playbook',
    'Learning',
    'Prospecting',
    'Templates',
    'Competitive',
    'Operational',
    'Scheduling',
    'Brand',
    'Insights',
];

export default function ResourcesClient() {
    const { user, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<'mine' | 'company'>('mine');
    const [activeCategory, setActiveCategory] = useState<ResourceCategory | 'All'>('All');
    const [searchQuery, setSearchQuery] = useState('');

    const [userResources, setUserResources] = useState<Resource[]>([]);
    const [companyResources, setCompanyResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    // Upload State
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadCategory, setUploadCategory] = useState<ResourceCategory>('Playbook');
    const [uploadDesc, setUploadDesc] = useState('');
    const [uploadVisibility, setUploadVisibility] = useState<'private' | 'company'>('private');
    const [isUploading, setIsUploading] = useState(false);

    // Fetch Resources
    useEffect(() => {
        async function fetchResources() {
            // Don't fetch until auth is resolved
            if (authLoading) return;

            // No user = not authenticated, stop loading
            if (!user?.uid) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // Ensure we have a valid auth token before making Firestore requests
                // This prevents race conditions where auth state exists but token isn't ready
                try {
                    await user.getIdToken(true);
                } catch (tokenError) {
                    console.error('Failed to get auth token:', tokenError);
                    setLoading(false);
                    return;
                }

                // Fetch company resources (with error handling for permissions)
                try {
                    const companyData = await ResourcesService.getCompanyResources();
                    setCompanyResources(companyData);
                } catch (companyError) {
                    console.warn('Could not load company resources:', companyError);
                    // Don't fail completely - user may not have company access
                    setCompanyResources([]);
                }

                // Fetch user resources
                try {
                    const userData = await ResourcesService.getUserResources(user.uid);
                    setUserResources(userData);
                } catch (userError) {
                    console.warn('Could not load user resources:', userError);
                    setUserResources([]);
                }
            } catch (error) {
                console.error('Failed to fetch resources:', error);
                // Don't show error toast for permission issues - just show empty state
            } finally {
                setLoading(false);
            }
        }

        fetchResources();
    }, [user, authLoading]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile || !user?.uid) return;

        setIsUploading(true);
        try {
            await ResourcesService.uploadResource(
                user.uid,
                uploadFile,
                uploadCategory,
                uploadDesc,
                uploadVisibility
            );
            toast.success('Resource uploaded successfully!');

            // Refresh list
            if (user?.uid) {
                const userData = await ResourcesService.getUserResources(user.uid);
                setUserResources(userData);
            }
            const companyData = await ResourcesService.getCompanyResources();
            setCompanyResources(companyData);

            // Reset form
            setUploadFile(null);
            setUploadDesc('');
            setUploadVisibility('private');
            setIsUploadOpen(false);
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('Failed to upload resource.');
        } finally {
            setIsUploading(false);
        }
    };

    const displayResources = activeTab === 'mine' ? userResources : companyResources;

    // Merge Mock data (System Resources) with User Resources ONLY if in Company View?
    // Actually, MOCK_RESOURCES are usually global, so let's put them in Company view.
    const allResources =
        activeTab === 'company' ? [...displayResources, ...MOCK_RESOURCES] : displayResources;

    const filteredResources = allResources.filter((resource) => {
        const matchesCategory = activeCategory === 'All' || resource.category === activeCategory;
        const matchesSearch =
            resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            resource.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'video':
                return <Video className="w-5 h-5 text-red-400" />;
            case 'deck':
                return <Presentation className="w-5 h-5 text-orange-400" />;
            case 'sheet':
                return <FileSpreadsheet className="w-5 h-5 text-green-400" />;
            case 'link':
                return <LinkIcon className="w-5 h-5 text-blue-400" />;
            default:
                return <FileText className="w-5 h-5 text-slate-300" />;
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
                        className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeCategory === 'All'
                                ? 'bg-blue-600/20 text-blue-300'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        All Resources
                    </button>

                    <div className="my-4 border-t border-slate-800" />

                    {CATEGORIES.map((category) => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeCategory === category
                                    ? 'bg-blue-600/20 text-blue-300'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8 relative">
                <header className="mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400 mb-2">
                            Enablement & Resources
                        </h1>
                        <p className="text-slate-400 mb-6">
                            Access all sales materials, training, and operational tools.
                        </p>

                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-1 bg-slate-800 rounded-lg flex items-center">
                                <button
                                    onClick={() => setActiveTab('mine')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'mine' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    My Resources
                                </button>
                                <button
                                    onClick={() => setActiveTab('company')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'company' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Company Depo
                                </button>
                            </div>
                        </div>

                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search guides, scripts, videos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="glass-input pl-10 h-10 text-base w-full"
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => setIsUploadOpen(true)}
                        className="glass-button flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" /> Upload Resource
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredResources.map((resource) => (
                        <GlassCard
                            key={resource.id}
                            className="group hover:bg-slate-800/60 transition-colors flex flex-col h-full"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors">
                                    {getIcon(resource.type)}
                                </div>
                                <Badge variant="default">{resource.category}</Badge>
                            </div>

                            <h3 className="font-semibold text-lg text-white mb-2 group-hover:text-blue-300 transition-colors">
                                {resource.title}
                            </h3>
                            <p className="text-slate-400 text-sm mb-4 line-clamp-2 flex-grow">
                                {resource.description}
                            </p>

                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-700/50">
                                <span className="text-xs text-slate-500">
                                    {new Date(resource.updatedAt).toLocaleDateString()}
                                </span>
                                <a
                                    href={resource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1"
                                >
                                    Access <Download className="w-3 h-3" />
                                </a>
                            </div>
                        </GlassCard>
                    ))}
                </div>

                {filteredResources.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 px-8">
                        <div className="relative mb-6">
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30">
                                <FileText className="w-12 h-12 text-indigo-400" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/30 to-orange-500/30 flex items-center justify-center border border-pink-500/30">
                                <Plus className="w-5 h-5 text-pink-400" />
                            </div>
                        </div>

                        <h3 className="text-xl font-semibold text-white mb-2">
                            {searchQuery ? 'No matches found' : 'Your knowledge hub awaits'}
                        </h3>
                        <p className="text-slate-400 text-center max-w-md mb-6">
                            {searchQuery
                                ? `No resources match "${searchQuery}". Try a different search or upload new content.`
                                : 'Upload battle cards, scripts, pitch decks, and training materials. Your team will thank you.'}
                        </p>

                        {!searchQuery && (
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => setIsUploadOpen(true)}
                                    className="glass-button flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3"
                                >
                                    <UploadCloud className="w-5 h-5" />
                                    Upload Your First Resource
                                </button>
                            </div>
                        )}

                        {!searchQuery && (
                            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                    <FileText className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                                    <span className="text-xs text-slate-400">Scripts</span>
                                </div>
                                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                    <Presentation className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                                    <span className="text-xs text-slate-400">Pitch Decks</span>
                                </div>
                                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                    <Video className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                                    <span className="text-xs text-slate-400">Training Videos</span>
                                </div>
                                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                    <FileSpreadsheet className="w-6 h-6 text-green-400 mx-auto mb-2" />
                                    <span className="text-xs text-slate-400">Battle Cards</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Upload Modal */}
            {isUploadOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <GlassCard className="w-full max-w-md relative animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setIsUploadOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-xl font-bold text-white mb-1">Upload Resource</h2>
                        <p className="text-sm text-slate-400 mb-6">
                            Add a document to your knowledge hub.
                        </p>

                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Category
                                </label>
                                <select
                                    value={uploadCategory}
                                    onChange={(e) =>
                                        setUploadCategory(e.target.value as ResourceCategory)
                                    }
                                    className="glass-input w-full"
                                >
                                    {CATEGORIES.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={uploadDesc}
                                    onChange={(e) => setUploadDesc(e.target.value)}
                                    className="glass-input w-full min-h-[80px]"
                                    placeholder="Brief summary..."
                                />
                            </div>

                            <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-blue-500/50 transition-colors">
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="hidden"
                                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                    accept=".pdf,.doc,.docx,.txt,.md"
                                />
                                <label htmlFor="file-upload" className="cursor-pointer block">
                                    <CloudIconOrText file={uploadFile} />
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={isUploading || !uploadFile}
                                className="glass-button w-full bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 flex justify-center"
                            >
                                {isUploading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    'Upload Resource'
                                )}
                            </button>
                        </form>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}

function CloudIconOrText({ file }: { file: File | null }) {
    if (file) {
        return (
            <div className="text-blue-400">
                <FileText className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-slate-500 mt-1">Click to change</p>
            </div>
        );
    }
    return (
        <div className="text-slate-400">
            <UploadCloud className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Click to select file</p>
            <p className="text-xs text-slate-500 mt-1">PDF, Docs, Text (Max 10MB)</p>
        </div>
    );
}
