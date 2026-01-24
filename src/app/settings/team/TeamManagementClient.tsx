'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/components/providers/AuthProvider';
import { TeamService, type TeamMember, type TeamRole } from '@/lib/firebase/team';
import { CompanyService } from '@/lib/firebase/company';
import {
    Users,
    UserPlus,
    Mail,
    Shield,
    Crown,
    User,
    ChevronLeft,
    Trash2,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';

// TeamMember type is now imported from TeamService

const ROLE_CONFIG = {
    admin: {
        label: 'Admin',
        icon: Crown,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/20',
        borderColor: 'border-amber-500/30',
        description: 'Full access to all features and team management',
    },
    manager: {
        label: 'Manager',
        icon: Shield,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
        description: 'View team analytics and manage team leads',
    },
    rep: {
        label: 'Sales Rep',
        icon: User,
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/20',
        borderColor: 'border-slate-500/30',
        description: 'Manage own leads and activities',
    },
};

// Team members are now fetched from Firebase

export default function TeamManagementClient() {
    const { user, profile } = useAuth();
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<TeamRole>('rep');
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState<string>('');

    const isEnterprise = profile?.tier === 'enterprise' || profile?.tier === 'pro';

    // Fetch company and team data from Firebase
    const fetchTeamData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const company = await CompanyService.getCompanyByUser(user.uid);
            if (company) {
                setCompanyId(company.id);
                setCompanyName(company.name);
                const members = await TeamService.getTeamMembers(company.id);
                setTeam(members);
            } else {
                // If no company, show current user as admin (solo user)
                setTeam([
                    {
                        id: user.uid,
                        email: user.email || '',
                        name: user.email?.split('@')[0] || 'You',
                        role: 'admin',
                        status: 'active',
                        joinedAt: Date.now(),
                    },
                ]);
            }
        } catch (error) {
            console.error('Failed to fetch team:', error);
            toast.error('Failed to load team members');
        } finally {
            setIsLoading(false);
        }
    }, [user, profile]);

    useEffect(() => {
        fetchTeamData();
    }, [fetchTeamData]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) {
            toast.error('Please enter an email address');
            return;
        }

        if (!companyId) {
            toast.error('No company found. Please set up your company first.');
            return;
        }

        if (team.find((m) => m.email.toLowerCase() === inviteEmail.toLowerCase())) {
            toast.error('This email is already on the team');
            return;
        }

        setIsSending(true);
        try {
            const response = await fetch('/api/team/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyId,
                    companyName,
                    email: inviteEmail,
                    role: inviteRole,
                    invitedBy: user?.uid,
                    invitedByName: user?.email?.split('@')[0] || 'Team Admin',
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send invitation');
            }

            // Add pending member to local state
            const newMember: TeamMember = {
                id: data.inviteId,
                email: inviteEmail,
                name: inviteEmail.split('@')[0],
                role: inviteRole,
                status: 'pending',
            };

            setTeam([...team, newMember]);
            setInviteEmail('');
            setShowInviteForm(false);
            toast.success(
                data.emailSent
                    ? `Invitation sent to ${inviteEmail}`
                    : `Invitation created (email delivery pending)`
            );
        } catch (error) {
            console.error('Failed to send invite:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
        } finally {
            setIsSending(false);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!companyId) return;

        try {
            await TeamService.removeMember(companyId, memberId);
            setTeam(team.filter((m) => m.id !== memberId));
            toast.success('Team member removed');
        } catch (error) {
            console.error('Failed to remove member:', error);
            toast.error('Failed to remove team member');
        }
    };

    const handleChangeRole = async (memberId: string, newRole: TeamRole) => {
        if (!companyId) return;

        try {
            await TeamService.updateMemberRole(companyId, memberId, newRole);
            setTeam(team.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));
            toast.success('Role updated');
        } catch (error) {
            console.error('Failed to update role:', error);
            toast.error('Failed to update role');
        }
    };

    if (!isEnterprise) {
        return (
            <div className="p-8 min-h-screen">
                <header className="mb-8">
                    <Link
                        href="/settings"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Settings
                    </Link>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                        Team Management
                    </h1>
                </header>

                <GlassCard className="max-w-lg text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <Users className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                        Upgrade to Pro or Enterprise
                    </h3>
                    <p className="text-slate-400 text-sm mb-6">
                        Team management features are available on Pro and Enterprise plans. Invite
                        team members, assign roles, and collaborate on deals.
                    </p>
                    <Link
                        href="/pricing"
                        className="inline-block px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-lg font-medium transition-all"
                    >
                        View Pricing
                    </Link>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="p-8 min-h-screen">
            {/* Header */}
            <header className="mb-8">
                <Link
                    href="/settings"
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Settings
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                            Team Management
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Invite members and manage access roles
                        </p>
                    </div>
                    <button
                        onClick={() => setShowInviteForm(!showInviteForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-lg font-medium transition-all"
                    >
                        <UserPlus className="w-4 h-4" />
                        Invite Member
                    </button>
                </div>
            </header>

            <div className="max-w-3xl space-y-6">
                {/* Invite Form */}
                {showInviteForm && (
                    <GlassCard className="border border-violet-500/30">
                        <form onSubmit={handleInvite} className="space-y-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Mail className="w-5 h-5 text-violet-400" />
                                Invite Team Member
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="colleague@company.com"
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">
                                        Role
                                    </label>
                                    <select
                                        value={inviteRole}
                                        onChange={(e) =>
                                            setInviteRole(
                                                e.target.value as 'admin' | 'manager' | 'rep'
                                            )
                                        }
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    >
                                        {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                                            <option key={key} value={key}>
                                                {config.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="text-xs text-slate-500">
                                {ROLE_CONFIG[inviteRole].description}
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={isSending}
                                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    {isSending ? 'Sending...' : 'Send Invitation'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowInviteForm(false)}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </GlassCard>
                )}

                {/* Team Members List */}
                <GlassCard>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-400" />
                        Team Members ({team.length})
                    </h3>

                    <div className="space-y-3">
                        {team.map((member) => {
                            const roleConfig = ROLE_CONFIG[member.role];
                            const RoleIcon = roleConfig.icon;

                            return (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-white/5"
                                >
                                    <div className="flex items-center gap-3">
                                        {member.avatar ? (
                                            <div className="relative w-10 h-10">
                                                <Image
                                                    src={member.avatar}
                                                    alt={member.name}
                                                    fill
                                                    className="rounded-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-600 to-slate-500 flex items-center justify-center text-white font-medium">
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <div className="text-white font-medium text-sm flex items-center gap-2">
                                                {member.name}
                                                {member.status === 'pending' && (
                                                    <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                                        Pending
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-slate-500 text-xs">
                                                {member.email}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <select
                                            value={member.role}
                                            onChange={(e) =>
                                                handleChangeRole(
                                                    member.id,
                                                    e.target.value as 'admin' | 'manager' | 'rep'
                                                )
                                            }
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${roleConfig.bgColor} ${roleConfig.color} border ${roleConfig.borderColor} bg-transparent focus:outline-none`}
                                        >
                                            {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                                                <option
                                                    key={key}
                                                    value={key}
                                                    className="bg-slate-800"
                                                >
                                                    {config.label}
                                                </option>
                                            ))}
                                        </select>

                                        <button
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </GlassCard>

                {/* Role Descriptions */}
                <GlassCard>
                    <h3 className="text-lg font-semibold text-white mb-4">Role Permissions</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {Object.entries(ROLE_CONFIG).map(([key, config]) => {
                            const RoleIcon = config.icon;
                            return (
                                <div
                                    key={key}
                                    className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor}`}
                                >
                                    <div className={`flex items-center gap-2 mb-2 ${config.color}`}>
                                        <RoleIcon className="w-4 h-4" />
                                        <span className="font-medium text-sm">{config.label}</span>
                                    </div>
                                    <p className="text-xs text-slate-400">{config.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
