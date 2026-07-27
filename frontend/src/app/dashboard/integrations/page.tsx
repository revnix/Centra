"use client";

import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Linkedin,
    Twitter,
    Facebook,
    Instagram,
    Plus,
    Check,
    ExternalLink,
    Settings,
    Trash2,
    Briefcase,
    Building2,
    Search,
    FileText,
    X,
    Loader2,
    CheckCircle2,
    MessageSquare
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Script from 'next/script';
import { integrationsApi } from '@/lib/api/index';

declare global {
    interface Window {
        FB: any;
        fbAsyncInit: () => void;
        __fbInitialized: boolean;
    }
}

interface SocialAccount {
    id: string;
    platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram' | 'indeed' | 'whatsapp';
    name: string;
    handle: string;
    avatar: string;
    connected: boolean;
    autoPublish: boolean;
}

interface JobPlatform {
    id: string;
    name: string;
    description: string;
    icon: React.ElementType;
    color: string;
    requiresCredentials: boolean;
}

const initialAccounts: SocialAccount[] = [
    {
        id: '1',
        platform: 'linkedin',
        name: 'LinkedIn Professional',
        handle: 'Not connected',
        avatar: 'LI',
        connected: false,
        autoPublish: false,
    },
    {
        id: '3',
        platform: 'indeed',
        name: 'Indeed Employer',
        handle: 'Not connected',
        avatar: 'IN',
        connected: false,
        autoPublish: false,
    },
    {
        id: '4',
        platform: 'whatsapp',
        name: 'WhatsApp Business',
        handle: 'Not connected',
        avatar: 'WA',
        connected: false,
        autoPublish: false,
    },
];

const jobPlatforms: JobPlatform[] = [
    {
        id: 'linkedin',
        name: 'LinkedIn',
        description: 'Connect your professional profile to post job openings',
        icon: Linkedin,
        color: '#0077b5',
        requiresCredentials: false,
    },
    {
        id: 'indeed',
        name: 'Indeed',
        description: "World's #1 job site with millions of job listings",
        icon: Briefcase,
        color: '#2563eb',
        requiresCredentials: false,
    },
    {
        id: 'whatsapp',
        name: 'WhatsApp',
        description: 'Send candidate notifications and job alerts via WhatsApp',
        icon: MessageSquare,
        color: '#25D366',
        requiresCredentials: false,
    },
    {
        id: 'glassdoor',
        name: 'Glassdoor',
        description: 'Job listings with company reviews and salary insights',
        icon: Building2,
        color: '#16a34a',
        requiresCredentials: true,
    },
    {
        id: 'ziprecruiter',
        name: 'ZipRecruiter',
        description: 'AI-powered job matching platform',
        icon: Search,
        color: '#10b981',
        requiresCredentials: true,
    },
    {
        id: 'monster',
        name: 'Monster',
        description: 'Global employment website for job seekers',
        icon: FileText,
        color: '#9333ea',
        requiresCredentials: true,
    },
    {
        id: 'instagram',
        name: 'Instagram',
        description: 'Share job postings with visual content on Instagram',
        icon: Instagram,
        color: '#e1306c',
        requiresCredentials: true,
    },
];

const platformConfig: Record<string, { icon: any; color: string; name: string }> = {
    linkedin: { icon: Linkedin, color: '#0077b5', name: 'LinkedIn' },
    indeed: { icon: Briefcase, color: '#2563eb', name: 'Indeed' },
    whatsapp: { icon: MessageSquare, color: '#25D366', name: 'WhatsApp' },
    twitter: { icon: Twitter, color: '#38bdf8', name: 'Twitter/X' },
    facebook: { icon: Facebook, color: '#1d4ed8', name: 'Facebook' },
    instagram: { icon: Instagram, color: '#e1306c', name: 'Instagram' },
};

export default function IntegrationsPage() {
    const [accounts, setAccounts] = useState<SocialAccount[]>(initialAccounts);
    const [linkedInStatus, setLinkedInStatus] = useState<{ connected: boolean; platform_user_id?: string }>({ connected: false });
    const [whatsappStatus, setWhatsappStatus] = useState<{ connected: boolean; phone_number_id?: string }>({ connected: false });
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);
    const [showPlatformsModal, setShowPlatformsModal] = useState(false);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [showWhatsappCredentialsModal, setShowWhatsappCredentialsModal] = useState(false);
    const [showWhatsappTestModal, setShowWhatsappTestModal] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<JobPlatform | null>(null);
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [whatsappCredentials, setWhatsappCredentials] = useState({
        phone_number_id: '',
        waba_id: '',
        access_token: '',
        verify_token: ''
    });
    const [whatsappTestMessage, setWhatsappTestMessage] = useState({ to: '', message: '' });
    const [isConnecting, setIsConnecting] = useState(false);
    const [isFacebookSdkReady, setIsFacebookSdkReady] = useState(false);
    const [isSendingTestMessage, setIsSendingTestMessage] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successPlatformName, setSuccessPlatformName] = useState('');

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        setIsLoadingStatus(true);
        try {
            const [linkedin, indeed, whatsapp] = await Promise.all([
                integrationsApi.linkedin.getStatus().catch(() => ({ connected: false })),
                integrationsApi.indeed.getStatus().catch(() => ({ connected: false })),
                integrationsApi.whatsapp.getStatus().catch(() => ({ connected: false }))
            ]);

            setLinkedInStatus(linkedin as any);
            setWhatsappStatus(whatsapp as any);

            setAccounts(prev => prev.map(acc => {
                if (acc.platform === 'linkedin') {
                    const status = linkedin as any;
                    return { ...acc, connected: status.connected, handle: status.platform_user_id || 'Not connected' };
                }
                if (acc.platform === 'indeed') {
                    const status = indeed as any;
                    return { ...acc, connected: status.connected, handle: status.platform_user_id || 'Not connected' };
                }
                if (acc.platform === 'whatsapp') {
                    const status = whatsapp as any;
                    return { ...acc, connected: status.connected, handle: status.phone_number_id ? 'Connected' : 'Not connected' };
                }
                return acc;
            }));
        } catch (error) {
            console.error("Failed to fetch integration status:", error);
        } finally {
            setIsLoadingStatus(false);
        }
    };

    const connectWhatsapp = async () => {
        if (!whatsappCredentials.phone_number_id || !whatsappCredentials.waba_id ||
            !whatsappCredentials.access_token || !whatsappCredentials.verify_token) {
            alert('Please fill in all fields');
            return;
        }

        setIsConnecting(true);
        try {
            await integrationsApi.whatsapp.connect(whatsappCredentials);
            alert('WhatsApp connected successfully!');
            setShowWhatsappCredentialsModal(false);
            setWhatsappCredentials({
                phone_number_id: '',
                waba_id: '',
                access_token: '',
                verify_token: ''
            });
            await fetchStatus();
        } catch (error: any) {
            console.error('Failed to connect WhatsApp:', error);
            alert(`Failed to connect WhatsApp: ${error.message || 'Unknown error'}`);
        } finally {
            setIsConnecting(false);
        }
    };

    const connectWithFacebook = () => {
        if (!isFacebookSdkReady || !window.FB) {
            alert("Facebook SDK is still loading. Please wait a moment and try again.");
            return;
        }

        setIsConnecting(true);
        window.FB.login(function(response: any) {
            if (response.authResponse) {
                const authCode = response.authResponse.code || response.authResponse.accessToken;
                (async () => {
                    try {
                        await integrationsApi.whatsapp.connectWithFacebook(authCode);
                        alert('WhatsApp connected successfully via Facebook!');
                        setShowWhatsappCredentialsModal(false);
                        await fetchStatus();
                    } catch (error: any) {
                        console.error('Failed to connect WhatsApp via Facebook:', error);
                        alert(`Failed to connect WhatsApp: ${error.message || 'Unknown error'}`);
                    } finally {
                        setIsConnecting(false);
                    }
                })();
            } else {
                setIsConnecting(false);
            }
        }, {
            config_id: process.env.NEXT_PUBLIC_FACEBOOK_CONFIG_ID || '',
            response_type: 'token',
            override_default_response_type: true
        });
    };

    const sendWhatsappTestMessage = async () => {
        if (!whatsappTestMessage.to || !whatsappTestMessage.message) return;

        setIsSendingTestMessage(true);
        try {
            await integrationsApi.whatsapp.sendMessage(
                whatsappTestMessage.to,
                whatsappTestMessage.message
            );
            alert('Test message sent successfully!');
            setShowWhatsappTestModal(false);
            setWhatsappTestMessage({ to: '', message: '' });
        } catch (error: any) {
            console.error('Failed to send test message:', error);
            alert(`Failed to send message: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSendingTestMessage(false);
        }
    };

    const toggleConnection = async (id: string) => {
        const account = accounts.find(a => a.id === id);
        if (!account) return;

        if (account.platform === 'whatsapp') {
            if (account.connected) {
                if (confirm('Are you sure you want to disconnect WhatsApp?')) {
                    try {
                        await integrationsApi.whatsapp.disconnect();
                        await fetchStatus();
                    } catch (error) {
                        console.error('Failed to disconnect WhatsApp:', error);
                    }
                }
            } else {
                setShowWhatsappCredentialsModal(true);
            }
            return;
        }

        if (account.platform === 'linkedin' || account.platform === 'indeed') {
            const api = account.platform === 'linkedin' ? integrationsApi.linkedin : integrationsApi.indeed;

            if (account.connected) {
                if (confirm(`Are you sure you want to disconnect ${account.platform === 'linkedin' ? 'LinkedIn' : 'Indeed'}?`)) {
                    try {
                        await api.disconnect();
                        await fetchStatus();
                    } catch (error) {
                        console.error(`Failed to disconnect ${account.platform}:`, error);
                    }
                }
            } else {
                try {
                    setIsConnecting(true);
                    const { authorization_url } = await api.getLoginUrl();
                    window.location.href = authorization_url;
                } catch (error: any) {
                    console.error(`Failed to get ${account.platform} login URL:`, error);
                    alert(`Failed to connect to ${account.platform}: ` + (error.message || "Unknown error"));
                    setIsConnecting(false);
                }
            }
            return;
        }

        setAccounts(prev =>
            prev.map(acc =>
                acc.id === id ? { ...acc, connected: !acc.connected } : acc
            )
        );
    };

    const toggleAutoPublish = (id: string) => {
        setAccounts(prev =>
            prev.map(acc =>
                acc.id === id ? { ...acc, autoPublish: !acc.autoPublish } : acc
            )
        );
    };

    const handlePlatformClick = async (platform: JobPlatform) => {
        if (platform.id === 'whatsapp') {
            setSelectedPlatform(platform);
            setShowPlatformsModal(false);
            await fetchStatus();
            if (!whatsappStatus.connected) {
                alert('Please configure WhatsApp credentials');
            }
            return;
        }

        if (platform.id === 'linkedin' || platform.id === 'indeed') {
            setSelectedPlatform(platform);
            setShowPlatformsModal(false);

            try {
                setIsConnecting(true);
                const api = platform.id === 'linkedin' ? integrationsApi.linkedin : integrationsApi.indeed;
                const { authorization_url } = await api.getLoginUrl();
                window.location.href = authorization_url;
            } catch (error) {
                console.error(`Failed to get ${platform.name} login URL:`, error);
                setIsConnecting(false);
                alert(`Failed to start ${platform.name} integration.`);
            }
            return;
        }

        setSelectedPlatform(platform);
        setShowPlatformsModal(false);
        setShowCredentialsModal(true);
        setCredentials({ username: '', password: '' });
    };

    const handleConnect = async () => {
        if (!credentials.username || !credentials.password) return;
        setIsConnecting(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsConnecting(false);
        setShowCredentialsModal(false);
        setSuccessPlatformName(selectedPlatform?.name || '');
        setShowSuccessMessage(true);

        setTimeout(() => setShowSuccessMessage(false), 4000);
        setCredentials({ username: '', password: '' });
        setSelectedPlatform(null);
    };

    const connectedCount = accounts.filter(a => a.connected).length;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <Script
                id="facebook-jssdk"
                src="https://connect.facebook.net/en_US/sdk.js"
                strategy="afterInteractive"
                onReady={() => {
                    if (!window.__fbInitialized) {
                        window.FB.init({
                            appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
                            autoLogAppEvents: false,
                            xfbml: true,
                            version: 'v25.0'
                        });
                        window.__fbInitialized = true;
                    }
                    setIsFacebookSdkReady(true);
                }}
            />

            {showSuccessMessage && (
                <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-3 duration-300">
                    <div className="bg-white border border-emerald-200 shadow-xl rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-900">Connection Successful</p>
                            <p className="text-xs text-slate-500">{successPlatformName} has been linked</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                    <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Integrations & Accounts</h1>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">Connect recruitment channels and social platforms to distribute job posts</p>
                </div>
                <button onClick={() => setShowPlatformsModal(true)} className="btn-dribbble h-9 px-4 text-xs font-semibold gap-1.5 flex items-center shadow-md">
                    <Plus className="w-4 h-4" /> Add Integration
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="panel-elevated p-5 rounded-2xl border border-slate-200/80 shadow-sm bg-white flex items-center justify-between">
                    <div>
                        <p className="text-2xl font-black text-slate-900 tracking-tight">{connectedCount}</p>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">Connected Channels</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>
                <div className="panel-elevated p-5 rounded-2xl border border-slate-200/80 shadow-sm bg-white flex items-center justify-between">
                    <div>
                        <p className="text-2xl font-black text-slate-900 tracking-tight">{accounts.filter(a => a.autoPublish).length}</p>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">Auto-Publish Enabled</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                        <Settings className="w-5 h-5" />
                    </div>
                </div>
                <div className="panel-elevated p-5 rounded-2xl border border-slate-200/80 shadow-sm bg-white flex items-center justify-between">
                    <div>
                        <p className="text-2xl font-black text-slate-900 tracking-tight">12</p>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">Posts This Month</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Account list */}
            <div className="panel-elevated p-6 rounded-2xl border border-slate-200/80 shadow-sm bg-white space-y-4">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Active Social Channels</h3>
                <div className="space-y-3">
                    {accounts.map((account) => {
                        const config = platformConfig[account.platform];
                        const Icon = config.icon;

                        return (
                            <div
                                key={account.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200/70 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all shadow-xs"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0" style={{ background: config.color }}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="text-sm font-bold text-slate-900">{account.name}</h4>
                                            {account.connected && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                                    <Check className="w-3 h-3" /> Connected
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs font-medium text-slate-500 mt-0.5">{account.handle}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 self-end sm:self-center">
                                    {account.connected && account.platform !== 'whatsapp' && (
                                        <div className="flex items-center gap-2 mr-2">
                                            <span className="text-xs font-semibold text-slate-600">Auto-publish</span>
                                            <Switch checked={account.autoPublish} onCheckedChange={() => toggleAutoPublish(account.id)} />
                                        </div>
                                    )}

                                    {account.connected ? (
                                        <div className="flex items-center gap-2">
                                            {account.platform === 'whatsapp' && (
                                                <button onClick={() => setShowWhatsappTestModal(true)} className="btn-glass border-slate-200 hover:border-indigo-300 hover:text-indigo-600 h-9 px-3 text-xs font-semibold">
                                                    Test Message
                                                </button>
                                            )}
                                            <button onClick={() => toggleConnection(account.id)} className="btn-glass border-slate-200 hover:border-rose-300 hover:text-rose-600 h-9 px-2.5 text-xs text-rose-500 transition-colors" title="Disconnect Account">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={() => toggleConnection(account.id)} className="btn-glass border-slate-200 hover:border-indigo-300 hover:text-indigo-600 h-9 px-4 text-xs font-semibold gap-1.5 flex items-center shadow-xs">
                                            <ExternalLink className="w-3.5 h-3.5" /> Connect
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Platforms Dialog */}
            <Dialog open={showPlatformsModal} onOpenChange={setShowPlatformsModal}>
                <DialogContent className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900">Select Platform to Connect</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 mt-1">
                            Publish jobs across recruitment boards with one click
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-2.5 py-3">
                        {jobPlatforms.map((platform) => {
                            const Icon = platform.icon;
                            return (
                                <button
                                    key={platform.id} onClick={() => handlePlatformClick(platform)}
                                    className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 text-left transition-all hover:border-indigo-300 hover:bg-white shadow-xs group"
                                >
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-xs" style={{ background: platform.color }}>
                                        <Icon className="w-4.5 h-4.5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{platform.name}</p>
                                        <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">{platform.description}</p>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                </button>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
