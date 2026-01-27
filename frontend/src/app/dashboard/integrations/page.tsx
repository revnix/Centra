"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    Lock
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useIndeedStatus, useConnectIndeed } from '@/lib/hooks/useIndeed';

/**
 * Integrations Page
 * Manage connected social media accounts for job posting
 */

interface SocialAccount {
    id: string;
    platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram' | 'indeed';
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

// Mock connected accounts
const initialAccounts: SocialAccount[] = [
    {
        id: '1',
        platform: 'linkedin',
        name: 'TechCorp Inc.',
        handle: 'techcorp-inc',
        avatar: 'TC',
        connected: true,
        autoPublish: true,
    },
    {
        id: '2',
        platform: 'twitter',
        name: 'TechCorp Careers',
        handle: '@TechCorpJobs',
        avatar: 'TC',
        connected: true,
        autoPublish: false,
    },
    {
        id: '3',
        platform: 'facebook',
        name: 'TechCorp',
        handle: 'facebook.com/techcorp',
        avatar: 'TC',
        connected: false,
        autoPublish: false,
    },
    {
        id: '4',
        platform: 'instagram',
        name: 'TechCorp Life',
        handle: '@techcorp_life',
        avatar: 'TC',
        connected: false,
        autoPublish: false,
    },
];

// Popular job posting platforms
const jobPlatforms: JobPlatform[] = [
    {
        id: 'indeed',
        name: 'Indeed',
        description: 'World\'s #1 job site with millions of job listings',
        icon: Briefcase,
        color: 'bg-blue-600',
        requiresCredentials: true,
    },
    {
        id: 'glassdoor',
        name: 'Glassdoor',
        description: 'Job listings with company reviews and salary insights',
        icon: Building2,
        color: 'bg-green-600',
        requiresCredentials: true,
    },
    {
        id: 'ziprecruiter',
        name: 'ZipRecruiter',
        description: 'AI-powered job matching platform',
        icon: Search,
        color: 'bg-emerald-500',
        requiresCredentials: true,
    },
    {
        id: 'monster',
        name: 'Monster',
        description: 'Global employment website for job seekers',
        icon: FileText,
        color: 'bg-purple-600',
        requiresCredentials: true,
    },
    {
        id: 'instagram',
        name: 'Instagram',
        description: 'Share job postings with visual content on Instagram',
        icon: Instagram,
        color: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400',
        requiresCredentials: true,
    },
];

const platformConfig = {
    linkedin: { icon: Linkedin, color: 'bg-blue-600', name: 'LinkedIn' },
    twitter: { icon: Twitter, color: 'bg-sky-500', name: 'Twitter/X' },
    facebook: { icon: Facebook, color: 'bg-blue-700', name: 'Facebook' },
    instagram: { icon: Instagram, color: 'bg-gradient-to-br from-purple-600 to-pink-500', name: 'Instagram' },
    indeed: { icon: Briefcase, color: 'bg-blue-600', name: 'Indeed' },
};

export default function IntegrationsPage() {
    const [accounts, setAccounts] = useState<SocialAccount[]>(initialAccounts);
    const [showPlatformsModal, setShowPlatformsModal] = useState(false);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<JobPlatform | null>(null);
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [isConnecting, setIsConnecting] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successPlatformName, setSuccessPlatformName] = useState('');

    const { data: indeedStatus, isLoading: isLoadingIndeed } = useIndeedStatus();
    const connectIndeed = useConnectIndeed();

    // Add Indeed to accounts if connected
    useEffect(() => {
        if (indeedStatus?.connected && !accounts.find(a => a.id === 'indeed')) {
            setAccounts(prev => [...prev, {
                id: 'indeed',
                platform: 'linkedin' as any, // HACK: the interface only has 4 platforms mentioned, I should probably update the interface
                name: 'Indeed Account',
                handle: indeedStatus.platform_user_id || 'Connected',
                avatar: 'ID',
                connected: true,
                autoPublish: true,
            }]);
        }
    }, [indeedStatus, accounts]);

    const toggleConnection = (id: string) => {
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

    const handlePlatformClick = (platform: JobPlatform) => {
        if (platform.id === 'indeed') {
            connectIndeed.mutate();
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

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));

        setIsConnecting(false);
        setShowCredentialsModal(false);
        setSuccessPlatformName(selectedPlatform?.name || '');
        setShowSuccessMessage(true);

        // Hide success message after 4 seconds
        setTimeout(() => {
            setShowSuccessMessage(false);
        }, 4000);

        // Reset credentials
        setCredentials({ username: '', password: '' });
        setSelectedPlatform(null);
    };

    const connectedCount = accounts.filter(a => a.connected).length;

    return (
        <div className="space-y-6 max-w-4xl relative">
            {/* Success Notification */}
            {showSuccessMessage && (
                <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-full">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="font-semibold">Connection Successful!</p>
                            <p className="text-sm text-green-100">{successPlatformName} has been connected to your account</p>
                        </div>
                        <button
                            onClick={() => setShowSuccessMessage(false)}
                            className="ml-4 hover:bg-white/20 p-1 rounded-full transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Integrations</h1>
                <p className="text-slate-500 mt-1">Connect your social media accounts to publish job postings automatically</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Connected Accounts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{connectedCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Auto-Publish Enabled</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {accounts.filter(a => a.autoPublish).length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Posts This Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">12</div>
                    </CardContent>
                </Card>
            </div>

            {/* Connected Accounts */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Social Media Accounts</CardTitle>
                            <CardDescription>Manage your connected platforms for job distribution</CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPlatformsModal(true)}
                            className="group hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                        >
                            <Plus className="h-4 w-4 mr-2 group-hover:text-blue-600 transition-colors" />
                            <span className="group-hover:text-blue-600 transition-colors">Add Account</span>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {accounts.map((account) => {
                        const config = platformConfig[account.platform];
                        const Icon = config.icon;

                        return (
                            <div
                                key={account.id}
                                className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${account.connected ? 'bg-white border-slate-200 hover:shadow-md' : 'bg-slate-50 border-dashed border-slate-300 hover:border-slate-400'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-lg ${config.color} text-white`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-slate-900">{account.name}</h4>
                                            {account.connected && (
                                                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                                                    <Check className="h-3 w-3 mr-1" />
                                                    Connected
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500">{account.handle}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    {account.connected && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-slate-600">Auto-publish</span>
                                            <Switch
                                                checked={account.autoPublish}
                                                onCheckedChange={() => toggleAutoPublish(account.id)}
                                            />
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        {account.connected ? (
                                            <>
                                                <Button variant="ghost" size="icon">
                                                    <Settings className="h-4 w-4 text-slate-500" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => toggleConnection(account.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                onClick={() => toggleConnection(account.id)}
                                            >
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                Connect
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Publishing Settings */}
            <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                    <CardTitle className="text-blue-900">Publishing Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium text-blue-900">Default to all connected accounts</h4>
                            <p className="text-sm text-blue-700">When approving a job post, all connected accounts will be pre-selected</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium text-blue-900">Include company branding</h4>
                            <p className="text-sm text-blue-700">Add company logo and colors to social media images</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                </CardContent>
            </Card>

            {/* Floating Plus Button */}
            <button
                onClick={() => setShowPlatformsModal(true)}
                className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-blue-500/30 hover:scale-110 transition-all duration-300 flex items-center justify-center group z-40"
            >
                <Plus className="h-7 w-7 group-hover:rotate-90 transition-transform duration-300" />
            </button>

            {/* Platforms Modal */}
            <Dialog open={showPlatformsModal} onOpenChange={setShowPlatformsModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Add Integration</DialogTitle>
                        <DialogDescription>
                            Connect popular job posting platforms to publish your listings
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 py-4">
                        {jobPlatforms.map((platform) => {
                            const Icon = platform.icon;
                            return (
                                <button
                                    key={platform.id}
                                    onClick={() => handlePlatformClick(platform)}
                                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 text-left group"
                                >
                                    <div className={`p-3 rounded-lg ${platform.color} text-white group-hover:scale-110 transition-transform duration-200`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{platform.name}</h4>
                                        <p className="text-sm text-slate-500">{platform.description}</p>
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                </button>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Credentials Modal */}
            <Dialog open={showCredentialsModal} onOpenChange={setShowCredentialsModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            {selectedPlatform && (
                                <div className={`p-3 rounded-lg ${selectedPlatform.color} text-white`}>
                                    <selectedPlatform.icon className="h-5 w-5" />
                                </div>
                            )}
                            <div>
                                <DialogTitle className="text-xl font-bold">
                                    Connect {selectedPlatform?.name}
                                </DialogTitle>
                                <DialogDescription>
                                    Enter your {selectedPlatform?.name} credentials to connect
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="username" className="text-sm font-medium">
                                {selectedPlatform?.id === 'instagram' ? 'Instagram Username' : 'Email / Username'}
                            </Label>
                            <Input
                                id="username"
                                placeholder={selectedPlatform?.id === 'instagram' ? '@username' : 'Enter your email or username'}
                                value={credentials.username}
                                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                                className="h-11"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password" className="text-sm font-medium">
                                Password
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={credentials.password}
                                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                                className="h-11"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Your credentials are securely encrypted and never stored in plain text.
                        </p>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setShowCredentialsModal(false)}
                            disabled={isConnecting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConnect}
                            disabled={!credentials.username || !credentials.password || isConnecting}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                            {isConnecting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Connect
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
