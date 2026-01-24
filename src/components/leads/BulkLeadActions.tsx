'use client';

/**
 * BulkLeadActions Component
 *
 * Provides bulk operations for selected leads.
 * Appears when leads are selected in the pipeline.
 *
 * Best practice 2026: Non-destructive bulk ops with confirmation
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Trash2,
    Tag,
    UserPlus,
    Mail,
    ArrowRight,
    AlertTriangle,
    CheckCircle,
    Loader2,
} from 'lucide-react';
import { LeadStatus } from '@/types';

interface BulkLeadActionsProps {
    selectedIds: string[];
    onClear: () => void;
    onDelete: (ids: string[]) => Promise<void>;
    onUpdateStatus: (ids: string[], status: LeadStatus) => Promise<void>;
    onAssign: (ids: string[], userId: string) => Promise<void>;
    onExport: (ids: string[]) => void;
    teamMembers?: { id: string; name: string }[];
}

type ActionState = 'idle' | 'loading' | 'success' | 'error';

const STATUSES: LeadStatus[] = [
    'New',
    'Contacted',
    'Qualified',
    'Proposal',
    'Negotiation',
    'Closed',
    'Lost',
];

export function BulkLeadActions({
    selectedIds,
    onClear,
    onDelete,
    onUpdateStatus,
    onAssign,
    onExport,
    teamMembers = [],
}: BulkLeadActionsProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showAssignMenu, setShowAssignMenu] = useState(false);
    const [actionState, setActionState] = useState<ActionState>('idle');
    const [actionMessage, setActionMessage] = useState('');

    const count = selectedIds.length;

    if (count === 0) return null;

    const handleDelete = async () => {
        setActionState('loading');
        setActionMessage(`Deleting ${count} lead${count > 1 ? 's' : ''}...`);
        try {
            await onDelete(selectedIds);
            setActionState('success');
            setActionMessage(`Deleted ${count} lead${count > 1 ? 's' : ''}`);
            setTimeout(() => {
                setActionState('idle');
                setShowDeleteConfirm(false);
                onClear();
            }, 1500);
        } catch (error) {
            setActionState('error');
            setActionMessage('Failed to delete leads');
            setTimeout(() => setActionState('idle'), 2000);
        }
    };

    const handleStatusChange = async (status: LeadStatus) => {
        setActionState('loading');
        setActionMessage(`Updating ${count} lead${count > 1 ? 's' : ''}...`);
        try {
            await onUpdateStatus(selectedIds, status);
            setActionState('success');
            setActionMessage(`Updated to ${status}`);
            setShowStatusMenu(false);
            setTimeout(() => {
                setActionState('idle');
                onClear();
            }, 1500);
        } catch (error) {
            setActionState('error');
            setActionMessage('Failed to update status');
            setTimeout(() => setActionState('idle'), 2000);
        }
    };

    const handleAssign = async (userId: string) => {
        setActionState('loading');
        setActionMessage(`Assigning ${count} lead${count > 1 ? 's' : ''}...`);
        try {
            await onAssign(selectedIds, userId);
            setActionState('success');
            setActionMessage(`Assigned ${count} lead${count > 1 ? 's' : ''}`);
            setShowAssignMenu(false);
            setTimeout(() => {
                setActionState('idle');
                onClear();
            }, 1500);
        } catch (error) {
            setActionState('error');
            setActionMessage('Failed to assign leads');
            setTimeout(() => setActionState('idle'), 2000);
        }
    };

    const handleExport = () => {
        onExport(selectedIds);
        onClear();
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
            >
                <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-4">
                    {/* Selection count */}
                    <div className="flex items-center gap-2 pr-4 border-r border-slate-700">
                        <span className="flex items-center justify-center w-7 h-7 bg-blue-500/20 text-blue-400 font-bold text-sm rounded-full">
                            {count}
                        </span>
                        <span className="text-sm text-slate-400">selected</span>
                    </div>

                    {/* Action state indicator */}
                    {actionState !== 'idle' && (
                        <div
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                                actionState === 'loading'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : actionState === 'success'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-red-500/20 text-red-400'
                            }`}
                        >
                            {actionState === 'loading' && (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            )}
                            {actionState === 'success' && <CheckCircle className="w-4 h-4" />}
                            {actionState === 'error' && <AlertTriangle className="w-4 h-4" />}
                            {actionMessage}
                        </div>
                    )}

                    {/* Actions */}
                    {actionState === 'idle' && (
                        <>
                            {/* Change Status */}
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setShowStatusMenu(!showStatusMenu);
                                        setShowAssignMenu(false);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                    Change Status
                                </button>

                                {showStatusMenu && (
                                    <div className="absolute bottom-full left-0 mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-2 min-w-[160px]">
                                        {STATUSES.map((status) => (
                                            <button
                                                key={status}
                                                onClick={() => handleStatusChange(status)}
                                                className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Assign */}
                            {teamMembers.length > 0 && (
                                <div className="relative">
                                    <button
                                        onClick={() => {
                                            setShowAssignMenu(!showAssignMenu);
                                            setShowStatusMenu(false);
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Assign
                                    </button>

                                    {showAssignMenu && (
                                        <div className="absolute bottom-full left-0 mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-2 min-w-[160px]">
                                            {teamMembers.map((member) => (
                                                <button
                                                    key={member.id}
                                                    onClick={() => handleAssign(member.id)}
                                                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                                                >
                                                    {member.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Export */}
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <Mail className="w-4 h-4" />
                                Export
                            </button>

                            {/* Delete */}
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </button>
                        </>
                    )}

                    {/* Clear selection */}
                    <button
                        onClick={onClear}
                        className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Delete confirmation */}
                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-slate-900 border border-red-500/30 rounded-xl shadow-2xl p-4 min-w-[300px]"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-red-500/20 rounded-lg">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-white mb-1">
                                    Delete {count} lead{count > 1 ? 's' : ''}?
                                </h4>
                                <p className="text-sm text-slate-400 mb-4">
                                    This action cannot be undone. All associated data will be
                                    permanently removed.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
