'use client';

import React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { TrendingUp, TrendingDown, Target, Phone, Mail, Calendar, Users, DollarSign } from 'lucide-react';

export default function AnalyticsPage() {
    // Mock data for analytics
    const weeklyStats = [
        { day: 'Mon', dials: 52, connects: 6, meetings: 2 },
        { day: 'Tue', dials: 48, connects: 5, meetings: 1 },
        { day: 'Wed', dials: 55, connects: 8, meetings: 3 },
        { day: 'Thu', dials: 45, connects: 4, meetings: 1 },
        { day: 'Fri', dials: 38, connects: 3, meetings: 2 },
    ];

    const maxDials = Math.max(...weeklyStats.map(d => d.dials));

    return (
        <div className="p-8 min-h-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">
                    Analytics Dashboard
                </h1>
                <p className="text-slate-500 text-sm mt-1">Track your performance metrics and trends</p>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-400">Weekly Dials</p>
                            <p className="text-2xl font-bold text-white mt-1">238</p>
                            <div className="flex items-center gap-1 mt-2">
                                <TrendingUp className="w-4 h-4 text-green-400" />
                                <span className="text-xs text-green-400">+12% vs last week</span>
                            </div>
                        </div>
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                            <Phone className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-400">Connect Rate</p>
                            <p className="text-2xl font-bold text-white mt-1">10.9%</p>
                            <div className="flex items-center gap-1 mt-2">
                                <TrendingUp className="w-4 h-4 text-green-400" />
                                <span className="text-xs text-green-400">+2.1% vs last week</span>
                            </div>
                        </div>
                        <div className="p-3 bg-green-500/20 rounded-lg">
                            <Users className="w-6 h-6 text-green-400" />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-400">Meetings Booked</p>
                            <p className="text-2xl font-bold text-white mt-1">9</p>
                            <div className="flex items-center gap-1 mt-2">
                                <TrendingDown className="w-4 h-4 text-red-400" />
                                <span className="text-xs text-red-400">-2 vs last week</span>
                            </div>
                        </div>
                        <div className="p-3 bg-purple-500/20 rounded-lg">
                            <Calendar className="w-6 h-6 text-purple-400" />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-400">Pipeline Created</p>
                            <p className="text-2xl font-bold text-white mt-1">$45.2k</p>
                            <div className="flex items-center gap-1 mt-2">
                                <TrendingUp className="w-4 h-4 text-green-400" />
                                <span className="text-xs text-green-400">+$12k vs last week</span>
                            </div>
                        </div>
                        <div className="p-3 bg-amber-500/20 rounded-lg">
                            <DollarSign className="w-6 h-6 text-amber-400" />
                        </div>
                    </div>
                </GlassCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Weekly Activity Chart */}
                <GlassCard className="lg:col-span-2">
                    <h3 className="font-semibold text-white mb-6">Weekly Activity Breakdown</h3>
                    <div className="space-y-4">
                        {weeklyStats.map((stat) => (
                            <div key={stat.day} className="flex items-center gap-4">
                                <span className="w-10 text-sm text-slate-400">{stat.day}</span>
                                <div className="flex-1 h-8 bg-slate-800 rounded-lg overflow-hidden relative">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                                        style={{ width: `${(stat.dials / maxDials) * 100}%` }}
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white font-medium">
                                        {stat.dials} dials
                                    </span>
                                </div>
                                <div className="flex gap-3 w-32">
                                    <Badge variant="success">{stat.connects} connects</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                {/* Performance Metrics */}
                <GlassCard>
                    <h3 className="font-semibold text-white mb-4">Performance vs Target</h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-400">Daily Dial Target</span>
                                <span className="text-white">45/50</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all" style={{ width: '90%' }} />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-400">Weekly Meeting Goal</span>
                                <span className="text-white">9/12</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 transition-all" style={{ width: '75%' }} />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-400">Monthly Revenue</span>
                                <span className="text-white">$85k/$100k</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 transition-all" style={{ width: '85%' }} />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-400">Email Response Rate</span>
                                <span className="text-white">24%</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 transition-all" style={{ width: '80%' }} />
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Leaderboard */}
            <GlassCard className="mt-6">
                <h3 className="font-semibold text-white mb-4">Team Leaderboard</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-slate-400 border-b border-slate-700">
                                <th className="pb-3">Rank</th>
                                <th className="pb-3">Rep</th>
                                <th className="pb-3">Dials</th>
                                <th className="pb-3">Connects</th>
                                <th className="pb-3">Meetings</th>
                                <th className="pb-3">Pipeline</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { rank: 1, name: 'Sarah Chen', dials: 285, connects: 32, meetings: 14, pipeline: '$125k' },
                                { rank: 2, name: 'Alex Rep', dials: 238, connects: 26, meetings: 9, pipeline: '$98k' },
                                { rank: 3, name: 'Mike Johnson', dials: 212, connects: 21, meetings: 8, pipeline: '$82k' },
                                { rank: 4, name: 'Emily Davis', dials: 198, connects: 19, meetings: 7, pipeline: '$65k' },
                                { rank: 5, name: 'James Wilson', dials: 175, connects: 15, meetings: 5, pipeline: '$45k' },
                            ].map((rep) => (
                                <tr key={rep.rank} className="border-b border-slate-800 hover:bg-white/5">
                                    <td className="py-3">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${rep.rank === 1 ? 'bg-amber-500/20 text-amber-400' :
                                                rep.rank === 2 ? 'bg-slate-400/20 text-slate-300' :
                                                    rep.rank === 3 ? 'bg-orange-600/20 text-orange-400' :
                                                        'bg-slate-700 text-slate-400'
                                            }`}>
                                            {rep.rank}
                                        </span>
                                    </td>
                                    <td className="py-3 text-white font-medium">{rep.name}</td>
                                    <td className="py-3 text-blue-400">{rep.dials}</td>
                                    <td className="py-3 text-green-400">{rep.connects}</td>
                                    <td className="py-3 text-purple-400">{rep.meetings}</td>
                                    <td className="py-3 text-amber-400">{rep.pipeline}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}
