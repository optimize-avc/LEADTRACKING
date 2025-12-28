'use client';

import React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import {
    TrendingUp,
    TrendingDown,
    Target,
    Phone,
    Calendar,
    Users,
    DollarSign,
    BarChart3,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { calculateRevenueForecast, ForecastResult } from '@/lib/utils/forecasting';
import { useAuth } from '@/components/providers/AuthProvider';
import { LeadsService } from '@/lib/firebase/services';
import { Lead } from '@/types';
import { formatCurrency } from '@/lib/utils/formatters';
import { useState, useEffect } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from 'recharts';

const data = [
    { name: 'Mon', dials: 52, connects: 6, meetings: 2, pipeline: 4500 },
    { name: 'Tue', dials: 48, connects: 5, meetings: 1, pipeline: 3200 },
    { name: 'Wed', dials: 55, connects: 8, meetings: 3, pipeline: 6800 },
    { name: 'Thu', dials: 45, connects: 4, meetings: 1, pipeline: 2100 },
    { name: 'Fri', dials: 38, connects: 3, meetings: 2, pipeline: 5400 },
    { name: 'Sat', dials: 15, connects: 1, meetings: 0, pipeline: 1200 },
    { name: 'Sun', dials: 10, connects: 1, meetings: 0, pipeline: 800 },
];

export default function AnalyticsClient() {
    const { user } = useAuth();
    const [forecast, setForecast] = useState<ForecastResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    console.log('Analytics loading:', isLoading); // Temporarily use it to stop warning if I don't want to remove it

    useEffect(() => {
        const loadForecast = async () => {
            if (!user) {
                // Mock calculation for demo mode
                const mockLeads: Lead[] = [
                    {
                        value: 50000,
                        status: 'Negotiation',
                        companyName: 'Demo Corp',
                        contactName: 'Alex Demo',
                        email: 'alex@demo.com',
                        phone: '',
                        id: '1',
                        assignedTo: 'demo',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    },
                    {
                        value: 25000,
                        status: 'Proposal',
                        companyName: 'Test Inc',
                        contactName: 'Sarah Test',
                        email: 'sarah@test.com',
                        phone: '',
                        id: '2',
                        assignedTo: 'demo',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    },
                    {
                        value: 15000,
                        status: 'Qualified',
                        companyName: 'Cloud Co',
                        contactName: 'Mike Cloud',
                        email: 'mike@cloud.com',
                        phone: '',
                        id: '3',
                        assignedTo: 'demo',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    },
                ];
                setForecast(calculateRevenueForecast(mockLeads));
                setIsLoading(false);
                return;
            }

            try {
                const leads = await LeadsService.getLeads(user.uid);
                setForecast(calculateRevenueForecast(leads));
            } catch (error) {
                console.error('Forecast failed', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadForecast();
    }, [user]);
    return (
        <div className="p-8 min-h-screen">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="text-cyan-400 w-5 h-5" />
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
                            Performance Intelligence
                        </span>
                    </div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-400 to-blue-400">
                        Analytics Dashboard
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Real-time performance metrics and predictive trends
                    </p>
                </div>

                {forecast && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="hidden lg:block"
                    >
                        <GlassCard className="!py-3 !px-6 border-cyan-500/30 bg-cyan-500/5 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-cyan-500/10 rounded-lg">
                                    <Target className="w-5 h-5 text-cyan-400 animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-cyan-500 uppercase font-bold tracking-widest">
                                        Q1 Risk-Adjusted Forecast
                                    </p>
                                    <p className="text-2xl font-bold text-white leading-none mt-1">
                                        {formatCurrency(forecast.weightedForecast)}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end border-l border-slate-700/50 pl-4 ml-2">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold">
                                        Confidence
                                    </span>
                                    <div className="flex gap-1 mt-1">
                                        {[1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1 w-3 rounded-full ${
                                                    forecast.confidence === 'high'
                                                        ? 'bg-cyan-400'
                                                        : forecast.confidence === 'medium' && i <= 2
                                                          ? 'bg-amber-400'
                                                          : forecast.confidence === 'low' && i === 1
                                                            ? 'bg-red-400'
                                                            : 'bg-slate-700'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                    {
                        title: 'Weekly Dials',
                        value: '238',
                        change: '+12%',
                        icon: Phone,
                        color: 'blue',
                        trend: 'up',
                    },
                    {
                        title: 'Connect Rate',
                        value: '10.9%',
                        change: '+2.1%',
                        icon: Users,
                        color: 'green',
                        trend: 'up',
                    },
                    {
                        title: 'Meetings Booked',
                        value: '9',
                        change: '-2',
                        icon: Calendar,
                        color: 'purple',
                        trend: 'down',
                    },
                    {
                        title: 'Pipeline Created',
                        value: '$45.2k',
                        change: '+$12k',
                        icon: DollarSign,
                        color: 'amber',
                        trend: 'up',
                    },
                ].map((stat, i) => (
                    <GlassCard key={i} className="group hover:border-white/20 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">{stat.title}</p>
                                <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                                <div className="flex items-center gap-1 mt-2">
                                    {stat.trend === 'up' ? (
                                        <TrendingUp className="w-4 h-4 text-green-400" />
                                    ) : (
                                        <TrendingDown className="w-4 h-4 text-red-400" />
                                    )}
                                    <span
                                        className={`text-xs font-medium ${stat.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}
                                    >
                                        {stat.change} vs last week
                                    </span>
                                </div>
                            </div>
                            <div
                                className={`p-4 bg-${stat.color}-500/10 rounded-2xl group-hover:scale-110 transition-transform`}
                            >
                                <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
                            </div>
                        </div>
                    </GlassCard>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue/Pipeline Volume (Area Chart) */}
                <GlassCard className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-white">Pipeline Volume</h3>
                            <p className="text-xs text-slate-500 uppercase tracking-tighter">
                                7-Day Revenue Velocity
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="info">Live Feed</Badge>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorPipeline" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="#1e293b"
                                />
                                <XAxis
                                    dataKey="name"
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#0f172a',
                                        border: '1px solid #1e293b',
                                        borderRadius: '12px',
                                    }}
                                    itemStyle={{ color: '#f8fafc' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="pipeline"
                                    stroke="#3b82f6"
                                    fillOpacity={1}
                                    fill="url(#colorPipeline)"
                                    strokeWidth={3}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* Performance Metrics (Bar Chart) */}
                <GlassCard>
                    <h3 className="text-lg font-bold text-white mb-6">Activity Efficiency</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.slice(0, 5)}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="#1e293b"
                                />
                                <XAxis
                                    dataKey="name"
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#1e293b', opacity: 0.4 }}
                                    contentStyle={{
                                        backgroundColor: '#0f172a',
                                        border: '1px solid #1e293b',
                                        borderRadius: '12px',
                                    }}
                                />
                                <Bar
                                    dataKey="connects"
                                    fill="#10b981"
                                    radius={[4, 4, 0, 0]}
                                    barSize={20}
                                />
                                <Bar
                                    dataKey="meetings"
                                    fill="#a855f7"
                                    radius={[4, 4, 0, 0]}
                                    barSize={20}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-6 flex justify-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-xs text-slate-400">Connects</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                            <span className="text-xs text-slate-400">Meetings</span>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Team Performance Leaderboard */}
            <GlassCard className="mt-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Target size={120} />
                </div>
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Users className="text-blue-400" size={20} />
                    Elite Performance Leaderboard
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-slate-500 uppercase text-[10px] tracking-widest border-b border-slate-800">
                                <th className="pb-4 font-bold">Rank</th>
                                <th className="pb-4 font-bold">Sales Professional</th>
                                <th className="pb-4 font-bold">Activity Vol.</th>
                                <th className="pb-4 font-bold">Conversion</th>
                                <th className="pb-4 font-bold">Revenue Contrib.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {[
                                {
                                    rank: 1,
                                    name: 'Sarah Chen',
                                    dials: 285,
                                    conv: '11.2%',
                                    rev: '$125,000',
                                    badge: 'MVP',
                                },
                                {
                                    rank: 2,
                                    name: 'Alex Rep',
                                    dials: 238,
                                    conv: '10.9%',
                                    rev: '$98,400',
                                    badge: 'Top Gun',
                                },
                                {
                                    rank: 3,
                                    name: 'Mike Johnson',
                                    dials: 212,
                                    conv: '9.9%',
                                    rev: '$82,100',
                                    badge: null,
                                },
                                {
                                    rank: 4,
                                    name: 'Emily Davis',
                                    dials: 198,
                                    conv: '9.6%',
                                    rev: '$65,000',
                                    badge: null,
                                },
                            ].map((rep) => (
                                <tr
                                    key={rep.rank}
                                    className="group hover:bg-blue-500/5 transition-all"
                                >
                                    <td className="py-4">
                                        <div
                                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                                                rep.rank === 1
                                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                                    : rep.rank === 2
                                                      ? 'bg-slate-400/20 text-slate-300 border border-slate-700'
                                                      : 'text-slate-500'
                                            }`}
                                        >
                                            {rep.rank}
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-white font-semibold">
                                                {rep.name}
                                            </span>
                                            {rep.badge && (
                                                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px] px-1.5 py-0">
                                                    {rep.badge}
                                                </Badge>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 font-mono text-slate-400">
                                        {rep.dials} dials
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-green-500"
                                                    style={{ width: rep.conv }}
                                                />
                                            </div>
                                            <span className="text-xs text-green-400 font-bold">
                                                {rep.conv}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 text-amber-400 font-bold font-mono">
                                        {rep.rev}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}
