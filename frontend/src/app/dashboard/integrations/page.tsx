"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Linkedin,
    Twitter,
    Facebook,
    Instagram,
    Plus,
    Check,
    ExternalLink,
    Settings,
    Trash2
} from 'lucide-react';
import { useState } from 'react';

/**
 * Integrations Page
 * Manage connected social media accounts for job posting
 */

interface SocialAccount {
    id: string;
    platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram';
    name: string;
    handle: string;
    avatar: string;
    connected: boolean;
    autoPublish: boolean;
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

const platformConfig = {
    linkedin: { icon: Linkedin, color: 'bg-blue-600', name: 'LinkedIn' },
    twitter: { icon: Twitter, color: 'bg-sky-500', name: 'Twitter/X' },
    facebook: { icon: Facebook, color: 'bg-blue-700', name: 'Facebook' },
    instagram: { icon: Instagram, color: 'bg-gradient-to-br from-purple-600 to-pink-500', name: 'Instagram' },
};

export default function IntegrationsPage() {
    const [accounts, setAccounts] = useState<SocialAccount[]>(initialAccounts);

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

    const connectedCount = accounts.filter(a => a.connected).length;

    return (
        <div className="space-y-6 max-w-4xl">
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
                        <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Account
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
                                className={`flex items-center justify-between p-4 rounded-lg border ${account.connected ? 'bg-white border-slate-200' : 'bg-slate-50 border-dashed border-slate-300'
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
        </div>
    );
}
