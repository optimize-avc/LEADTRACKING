'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Check, X, ExternalLink, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Notification {
    id: string;
    type: 'lead' | 'meeting' | 'system' | 'alert';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    link?: string;
}

// Sample notifications - in production these would come from Firebase
const SAMPLE_NOTIFICATIONS: Notification[] = [
    {
        id: '1',
        type: 'lead',
        title: 'New Lead Activity',
        message: 'Tech Corp Global opened your email',
        timestamp: new Date(Date.now() - 1000 * 60 * 10), // 10 min ago
        read: false,
        link: '/leads',
    },
    {
        id: '2',
        type: 'meeting',
        title: 'Meeting Reminder',
        message: 'Call with AI Solutions Inc in 30 minutes',
        timestamp: new Date(Date.now() - 1000 * 60 * 25), // 25 min ago
        read: false,
    },
    {
        id: '3',
        type: 'system',
        title: 'Week in Review',
        message: 'Your weekly performance digest is ready',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        read: true,
        link: '/analytics',
    },
];

function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function getTypeColor(type: Notification['type']): string {
    switch (type) {
        case 'lead':
            return 'bg-blue-500';
        case 'meeting':
            return 'bg-emerald-500';
        case 'system':
            return 'bg-violet-500';
        case 'alert':
            return 'bg-red-500';
        default:
            return 'bg-slate-500';
    }
}

export function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>(SAMPLE_NOTIFICATIONS);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const unreadCount = notifications.filter((n) => !n.read).length;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'Escape') {
            setIsOpen(false);
            buttonRef.current?.focus();
        }
    }, []);

    const markAsRead = (id: string) => {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    };

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const deleteNotification = (id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon Button */}
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                aria-controls="notification-menu"
            >
                <Bell className="w-5 h-5" aria-hidden="true" />
                {unreadCount > 0 && (
                    <span
                        className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                        aria-hidden="true"
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    id="notification-menu"
                    role="menu"
                    aria-label="Notifications"
                    onKeyDown={handleKeyDown}
                    className="absolute right-0 mt-2 w-80 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                        <h3 id="notification-heading" className="text-white font-semibold">
                            Notifications
                        </h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                                    aria-label="Mark all notifications as read"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div
                        className="max-h-80 overflow-y-auto"
                        role="list"
                        aria-labelledby="notification-heading"
                    >
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm" role="listitem">
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    role="listitem"
                                    className={`group flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 ${
                                        !notification.read ? 'bg-violet-500/5' : ''
                                    }`}
                                >
                                    {/* Type indicator */}
                                    <div
                                        className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getTypeColor(
                                            notification.type
                                        )}`}
                                        aria-hidden="true"
                                    />

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span
                                                className={`text-sm font-medium ${
                                                    notification.read
                                                        ? 'text-slate-400'
                                                        : 'text-white'
                                                }`}
                                            >
                                                {notification.title}
                                                {!notification.read && (
                                                    <span className="sr-only"> (unread)</span>
                                                )}
                                            </span>
                                            <span className="text-xs text-slate-500 whitespace-nowrap">
                                                <span className="sr-only">Received </span>
                                                {formatTimeAgo(notification.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate">
                                            {notification.message}
                                        </p>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {notification.link && (
                                                <Link
                                                    href={notification.link}
                                                    onClick={() => {
                                                        markAsRead(notification.id);
                                                        setIsOpen(false);
                                                    }}
                                                    className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                                                    aria-label={`View ${notification.title}`}
                                                >
                                                    View{' '}
                                                    <ExternalLink
                                                        className="w-3 h-3"
                                                        aria-hidden="true"
                                                    />
                                                </Link>
                                            )}
                                            {!notification.read && (
                                                <button
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                                                    aria-label={`Mark "${notification.title}" as read`}
                                                >
                                                    <Check className="w-3 h-3" aria-hidden="true" />{' '}
                                                    Read
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteNotification(notification.id)}
                                                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                                                aria-label={`Delete notification: ${notification.title}`}
                                            >
                                                <Trash2 className="w-3 h-3" aria-hidden="true" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="flex items-center justify-between px-4 py-2 border-t border-white/10">
                            <Link
                                href="/settings/account"
                                onClick={() => setIsOpen(false)}
                                className="text-xs text-slate-400 hover:text-white transition-colors"
                            >
                                Notification settings
                            </Link>
                            <button
                                onClick={clearAll}
                                className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                                aria-label="Clear all notifications"
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
