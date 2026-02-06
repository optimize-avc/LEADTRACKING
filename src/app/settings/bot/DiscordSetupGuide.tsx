'use client';

import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import {
    ChevronDown,
    ChevronUp,
    ExternalLink,
    AlertCircle,
    Lightbulb,
    Shield,
    Hash,
    Bot,
    Server,
    Zap,
} from 'lucide-react';

interface StepProps {
    number: number;
    title: string;
    children: React.ReactNode;
    tip?: string;
    warning?: string;
}

function Step({ number, title, children, tip, warning }: StepProps) {
    return (
        <div className="relative pl-12 pb-8 last:pb-0">
            {/* Vertical line */}
            <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500/50 to-transparent last:hidden" />
            
            {/* Step number */}
            <div className="absolute left-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/30">
                {number}
            </div>
            
            <div>
                <h4 className="text-lg font-semibold text-white mb-3">{title}</h4>
                <div className="text-slate-300 text-sm leading-relaxed space-y-3">
                    {children}
                </div>
                
                {tip && (
                    <div className="mt-4 flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <Lightbulb size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-green-300">{tip}</p>
                    </div>
                )}
                
                {warning && (
                    <div className="mt-4 flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <AlertCircle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-amber-300">{warning}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function DiscordSetupGuide() {
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
        <GlassCard className="border-l-4 border-l-amber-500">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between text-left"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                        <Zap size={20} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">
                            📚 Discord Bot Setup Guide
                        </h3>
                        <p className="text-sm text-slate-400">
                            First time? Follow this step-by-step guide to connect your Discord bot
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-sm">{isExpanded ? 'Hide' : 'Show'} Guide</span>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </button>
            
            {isExpanded && (
                <div className="mt-6 pt-6 border-t border-white/10">
                    {/* Quick overview */}
                    <div className="mb-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                        <h4 className="font-semibold text-indigo-300 mb-2">⏱️ Estimated Time: 5-10 minutes</h4>
                        <p className="text-sm text-slate-300">
                            You&apos;ll create your own Discord bot that sends notifications to your server. 
                            This keeps your data private and gives you full control over the bot.
                        </p>
                    </div>
                    
                    {/* Steps */}
                    <div className="space-y-2">
                        <Step 
                            number={1} 
                            title="Create a Discord Application"
                            tip="You can name your application anything - it won&apos;t affect how the bot appears in your server."
                        >
                            <p>
                                Go to the{' '}
                                <a 
                                    href="https://discord.com/developers/applications" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-1"
                                >
                                    Discord Developer Portal
                                    <ExternalLink size={12} />
                                </a>
                            </p>
                            <ol className="list-decimal list-inside space-y-2 ml-2">
                                <li>Click the <span className="text-white font-medium">&quot;New Application&quot;</span> button (top right)</li>
                                <li>Enter a name like <span className="text-white font-medium">&quot;SalesTracker Bot&quot;</span> or your company name</li>
                                <li>Accept the Terms of Service and click <span className="text-white font-medium">&quot;Create&quot;</span></li>
                            </ol>
                        </Step>
                        
                        <Step 
                            number={2} 
                            title="Create the Bot User"
                            warning="Never share your bot token with anyone! It gives full access to your bot."
                        >
                            <p>In your new application:</p>
                            <ol className="list-decimal list-inside space-y-2 ml-2">
                                <li>Click <span className="text-white font-medium">&quot;Bot&quot;</span> in the left sidebar</li>
                                <li>Click <span className="text-white font-medium">&quot;Add Bot&quot;</span> and confirm</li>
                                <li>Under the bot&apos;s username, click <span className="text-white font-medium">&quot;Reset Token&quot;</span></li>
                                <li>Click <span className="text-white font-medium">&quot;Copy&quot;</span> to copy your bot token</li>
                                <li><span className="text-amber-400 font-medium">Save this token somewhere safe!</span> You&apos;ll need it in Step 5</li>
                            </ol>
                            
                            <div className="mt-4 p-3 bg-white/5 rounded-lg">
                                <p className="text-xs text-slate-400 mb-2">Your token is a long random string - never share it publicly!</p>
                                <code className="text-xs text-indigo-400 font-mono break-all">
                                    [Your-Bot-Token-Here]
                                </code>
                            </div>
                        </Step>
                        
                        <Step 
                            number={3} 
                            title="Configure Bot Permissions"
                            tip="These are the minimum permissions needed. The bot can only do what you allow!"
                        >
                            <p>Still on the Bot page, scroll down to <span className="text-white font-medium">&quot;Privileged Gateway Intents&quot;</span>:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>Toggle ON: <span className="text-white font-medium">Server Members Intent</span> (optional, for @mentions)</li>
                            </ul>
                            
                            <p className="mt-4">The bot needs these permissions to work:</p>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="flex items-center gap-2 p-2 bg-white/5 rounded">
                                    <Hash size={14} className="text-indigo-400" />
                                    <span className="text-xs">View Channels</span>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-white/5 rounded">
                                    <Bot size={14} className="text-indigo-400" />
                                    <span className="text-xs">Send Messages</span>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-white/5 rounded">
                                    <Server size={14} className="text-indigo-400" />
                                    <span className="text-xs">Embed Links</span>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-white/5 rounded">
                                    <Shield size={14} className="text-indigo-400" />
                                    <span className="text-xs">Read Message History</span>
                                </div>
                            </div>
                        </Step>
                        
                        <Step 
                            number={4} 
                            title="Add Bot to Your Server"
                        >
                            <p>Now let&apos;s invite the bot to your Discord server:</p>
                            <ol className="list-decimal list-inside space-y-2 ml-2">
                                <li>Click <span className="text-white font-medium">&quot;OAuth2&quot;</span> in the left sidebar</li>
                                <li>Click <span className="text-white font-medium">&quot;URL Generator&quot;</span></li>
                                <li>Under <span className="text-white font-medium">Scopes</span>, check: <code className="bg-white/10 px-1 rounded">bot</code></li>
                                <li>Under <span className="text-white font-medium">Bot Permissions</span>, check:
                                    <ul className="list-disc list-inside ml-4 mt-1 text-slate-400">
                                        <li>Send Messages</li>
                                        <li>Embed Links</li>
                                        <li>Read Message History</li>
                                    </ul>
                                </li>
                                <li>Copy the generated URL at the bottom</li>
                                <li>Paste it in your browser and select your server</li>
                                <li>Click <span className="text-white font-medium">&quot;Authorize&quot;</span></li>
                            </ol>
                            
                            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                <p className="text-sm text-green-300">
                                    ✅ You should now see your bot in your server&apos;s member list (it will be offline until connected)
                                </p>
                            </div>
                        </Step>
                        
                        <Step 
                            number={5} 
                            title="Connect to SalesTracker"
                        >
                            <p>Now let&apos;s connect your bot to this app:</p>
                            <ol className="list-decimal list-inside space-y-2 ml-2">
                                <li>Click the <span className="text-white font-medium">&quot;Connect Discord&quot;</span> button above</li>
                                <li>Select your Discord server from the dropdown</li>
                                <li>Click <span className="text-white font-medium">&quot;Authorize&quot;</span></li>
                                <li>You&apos;ll be redirected back here with your server connected!</li>
                            </ol>
                        </Step>
                        
                        <Step 
                            number={6} 
                            title="Configure Notification Channels"
                            tip="You can create a dedicated channel like #sales-notifications to keep things organized!"
                        >
                            <p>After connecting, you&apos;ll see the <span className="text-white font-medium">Channel Mapping</span> section:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2">
                                <li><span className="text-white font-medium">New Leads:</span> Where new lead notifications appear</li>
                                <li><span className="text-white font-medium">Closed Won:</span> Celebrate your wins!</li>
                                <li><span className="text-white font-medium">Lead Triage:</span> Leads needing assignment or review</li>
                                <li><span className="text-white font-medium">Daily Digest:</span> Daily summary of activity</li>
                            </ul>
                            <p className="mt-3">
                                Select a channel for each notification type, then click{' '}
                                <span className="text-white font-medium">&quot;Save Channel Mapping&quot;</span>
                            </p>
                        </Step>
                    </div>
                    
                    {/* Troubleshooting */}
                    <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-lg">
                        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                            <AlertCircle size={16} className="text-amber-400" />
                            Common Issues
                        </h4>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-slate-300 font-medium">Bot not showing channels?</p>
                                <p className="text-slate-500">Make sure the bot has &quot;View Channels&quot; permission and can see the channels you want to use.</p>
                            </div>
                            <div>
                                <p className="text-slate-300 font-medium">Notifications not sending?</p>
                                <p className="text-slate-500">Check that you&apos;ve saved the channel mapping and the bot has &quot;Send Messages&quot; permission in that channel.</p>
                            </div>
                            <div>
                                <p className="text-slate-300 font-medium">Bot appears offline?</p>
                                <p className="text-slate-500">That&apos;s normal! The bot sends messages via API and doesn&apos;t need to be &quot;online&quot; to work.</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Support */}
                    <div className="mt-4 text-center text-sm text-slate-500">
                        Still stuck? Contact{' '}
                        <a href="mailto:support@avcpp.com" className="text-indigo-400 hover:text-indigo-300">
                            support@avcpp.com
                        </a>
                    </div>
                </div>
            )}
        </GlassCard>
    );
}
