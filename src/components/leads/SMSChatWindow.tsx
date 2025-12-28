'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Phone, X, MoreVertical } from 'lucide-react';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/components/providers/AuthProvider';
import { toast } from 'sonner';

interface Message {
    id: string;
    body: string;
    direction: 'inbound' | 'outbound';
    status: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdAt: any;
    leadId: string;
}

interface SMSChatWindowProps {
    leadId: string;
    leadName: string;
    leadPhone: string;
    onClose: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSent?: (msg: any) => void;
}

export function SMSChatWindow({ leadId, leadName, leadPhone, onClose }: SMSChatWindowProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Listen for messages
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'users', user.uid, 'messages'),
            where('leadId', '==', leadId),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const msgs = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Message[];
                setMessages(msgs);
                setIsLoading(false);
            },
            (error) => {
                console.error('Error fetching messages:', error);
                setIsLoading(false);
                // Index might be required
            }
        );

        return () => unsubscribe();
    }, [user, leadId]);

    const handleSend = async () => {
        if (!newMessage.trim() || !user) return;

        setIsSending(true);
        try {
            const response = await fetch('/api/twilio/sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toNumber: leadPhone,
                    message: newMessage.trim(),
                    userId: user.uid,
                    leadId,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to send');
            }

            setNewMessage('');
            // Optimistic update handled by snapshot listener mostly,
            // but we could add a temp message if needed.
            // Twilio API is fast enough usually.
        } catch (error: unknown) {
            toast.error('Failed to send message');
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatTime = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-[600px] w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
            {/* Header - Smartphone style */}
            <div className="bg-slate-800/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-white/5 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                        {leadName.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-semibold text-white text-sm">{leadName}</h3>
                        <p className="text-xs text-slate-400">{leadPhone}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50 scroll-smooth"
            >
                {isLoading && (
                    <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-slate-500" />
                    </div>
                )}

                {!isLoading && messages.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-sm">
                        No messages yet. Start the conversation!
                    </div>
                )}

                {messages.map((msg) => {
                    const isOutbound = msg.direction === 'outbound';
                    return (
                        <div
                            key={msg.id}
                            className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                                    isOutbound
                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                        : 'bg-slate-800 text-slate-200 rounded-bl-none'
                                }`}
                            >
                                <p>{msg.body}</p>
                                <div
                                    className={`text-[10px] mt-1 flex items-center gap-1 ${
                                        isOutbound
                                            ? 'text-indigo-200 justify-end'
                                            : 'text-slate-500'
                                    }`}
                                >
                                    {formatTime(msg.createdAt)}
                                    {isOutbound && (
                                        <span>
                                            {msg.status === 'delivered'
                                                ? '✓✓'
                                                : msg.status === 'sent'
                                                  ? '✓'
                                                  : ''}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-800/50 border-t border-white/5">
                <div className="flex items-end gap-2 bg-slate-900/50 p-2 rounded-xl border border-white/5 focus-within:border-indigo-500/50 transition-colors">
                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="iMessage..."
                        className="flex-1 bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 text-sm resize-none max-h-32 p-2"
                        rows={1}
                        style={{ minHeight: '40px' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || isSending}
                        className={`p-2 rounded-full mb-0.5 transition-all ${
                            newMessage.trim()
                                ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                                : 'bg-slate-800 text-slate-500'
                        }`}
                    >
                        {isSending ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Send size={18} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
