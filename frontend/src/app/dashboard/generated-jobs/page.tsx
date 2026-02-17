'use client';

import { useState, useEffect } from 'react';
import { useJobs, usePublishJob } from '@/lib/hooks/useJobs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Calendar, ArrowRight, CheckCircle2, Loader2, Rocket, Briefcase, Linkedin, Check, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { integrationsApi } from "@/lib/api/integrations";
import { jobsApi } from "@/lib/api/jobs";
import { toast } from "sonner";


interface ConnectedAccount {
    id: string;
    platform: 'linkedin' | 'twitter' | 'facebook' | 'indeed';
    name: string;
    handle: string;
    icon: any;
    color: string;
}

export default function GeneratedJobsPage() {
    const router = useRouter();
    const { data: jobsResponse, isLoading } = useJobs({ status: 'DRAFT' });
    const publishJob = usePublishJob();

    const jobs = jobsResponse || [];

    // Publish Dialog State
    const [showPublishDialog, setShowPublishDialog] = useState(false);
    const [selectedJob, setSelectedJob] = useState<any>(null);
    const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [isPublishing, setIsPublishing] = useState(false);

    // Fetch integrations on mount
    useEffect(() => {
        const fetchIntegrations = async () => {
            try {
                const integrations = await integrationsApi.list();
                if (!Array.isArray(integrations)) return;

                const formatted = integrations.map(int => {
                    const platform = int.platform.toLowerCase().trim();
                    if (platform === 'linkedin') {
                        return {
                            id: int.id.toString(),
                            platform: 'linkedin' as const,
                            name: 'LinkedIn Account',
                            handle: int.platform_user_id || 'Connected',
                            icon: Linkedin,
                            color: 'bg-blue-600',
                        };
                    } else if (platform === 'indeed') {
                        return {
                            id: int.id.toString(),
                            platform: 'indeed' as const,
                            name: 'Indeed Account',
                            handle: int.platform_user_id || 'Connected',
                            icon: Briefcase,
                            color: 'bg-blue-600',
                        };
                    }
                    return null;
                }).filter(Boolean) as ConnectedAccount[];

                // Deduplicate
                const uniquePlatforms = new Map<string, ConnectedAccount>();
                formatted.forEach(acc => {
                    if (!uniquePlatforms.has(acc.platform)) {
                        uniquePlatforms.set(acc.platform, acc);
                    }
                });
                const uniqueAccounts = Array.from(uniquePlatforms.values());

                setConnectedAccounts(uniqueAccounts);
                // Default select all
                setSelectedAccounts(uniqueAccounts.map(a => a.id));
            } catch (error) {
                console.error("Failed to fetch integrations:", error);
            }
        };

        fetchIntegrations();
    }, []);

    const handleOpenPublishDialog = (job: any) => {
        setSelectedJob(job);
        setShowPublishDialog(true);
    };

    const handleAccountToggle = (accountId: string) => {
        setSelectedAccounts(prev =>
            prev.includes(accountId)
                ? prev.filter(id => id !== accountId)
                : [...prev, accountId]
        );
    };

    const handleFinalPublish = async () => {
        if (!selectedJob) return;
        setIsPublishing(true);

        try {
            // 1. Publish to selected social platforms
            const publishPromises = selectedAccounts.map(async (accId) => {
                const account = connectedAccounts.find(a => a.id === accId);
                const jobUrl = `${window.location.origin}/jobs/${selectedJob.id}/apply`;

                if (account?.platform === 'linkedin') {
                    // Use full description for LinkedIn as per user requirement to preserve formatting and content
                    const text = selectedJob.description || selectedJob.short_description || `We are hiring a ${selectedJob.title}!`;
                    // Pass the job URL as article_url for clickable link preview
                    return integrationsApi.linkedin.publish(text, jobUrl);
                } else if (account?.platform === 'indeed') {
                    // Revert to backend-side publish which now has improved WAF bypass headers
                    return integrationsApi.indeed.postJob({
                        title: selectedJob.title,
                        description: `${selectedJob.description}\n\nApply Now: ${jobUrl}`,
                        location: selectedJob.location || 'Remote',
                        company: selectedJob.company_name || 'My Company'
                    });
                }
            });

            await Promise.all(publishPromises);

            // 2. Mark as published in our DB
            publishJob.mutate(selectedJob.id, {
                onSuccess: () => {
                    toast.success("Job published successfully to selected platforms!");
                    setShowPublishDialog(false);
                    router.refresh();
                },
                onError: (error: any) => {
                    toast.error(`Job posted to socials but failed to update local status: ${error.message}`);
                }
            });

        } catch (error: any) {
            console.error("Publish error:", error);
            const detail = error.response?.data?.detail || error.message;
            toast.error(`Failed to publish: ${detail}`);
        } finally {
            setIsPublishing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent">
                        Generated Jobs
                    </h1>
                    <p className="text-slate-500 mt-1">Review and publish AI-generated job postings</p>
                </div>
            </div>

            {jobs.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                            <Sparkles className="h-8 w-8 text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">No generated jobs found</h3>
                        <p className="text-slate-500 max-w-sm mt-2">
                            Jobs generated by the AI agent will appear here for your review and approval.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {jobs.map((job) => (
                        <Card
                            key={job.id}
                            className="group hover:shadow-lg transition-all duration-300 border-indigo-100/50 overflow-hidden"
                        >
                            <div className="flex flex-col md:flex-row md:items-center gap-6 p-6">
                                <div className="flex-1 min-w-0 space-y-3">
                                    <div className="flex items-start justify-between md:justify-start gap-4">
                                        <h3 className="text-xl font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                                            {job.title}
                                        </h3>
                                        {/* Status Badge */}
                                        <div className="flex gap-2">
                                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">
                                                AI Generated
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="h-4 w-4" />
                                            Generated {job.created_at ? format(new Date(job.created_at), 'PPP') : 'Recently'}
                                        </span>
                                        {job.department && (
                                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                                {job.department}
                                            </span>
                                        )}
                                        {job.location && (
                                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                                {job.location}
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-slate-600 line-clamp-2">
                                        {job.description}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 md:border-l md:border-slate-100 md:pl-6">
                                    <Link href={`/dashboard/jobs/${job.id}`}>
                                        <Button
                                            variant="outline"
                                            className="whitespace-nowrap"
                                        >
                                            Review Details
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="outline"
                                        onClick={async () => {
                                            try {
                                                const loadingToast = toast.loading("Sending to Operation Manager...");
                                                await jobsApi.sendToManager(job.id);
                                                toast.dismiss(loadingToast);
                                                toast.success("Job details sent to Operation Manager!");
                                            } catch (error: any) {
                                                toast.error(`Failed to send: ${error.message || "Unknown error"}`);
                                            }
                                        }}
                                        className="whitespace-nowrap flex gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                    >
                                        <Share2 className="h-4 w-4" />
                                        Send to Manager
                                    </Button>
                                    <Button
                                        onClick={() => handleOpenPublishDialog(job)}
                                        className="whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                                    >
                                        <Rocket className="h-4 w-4" />
                                        Publish Now
                                    </Button>
                                </div>

                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Publish Dialog - Account Selection */}
            <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Rocket className="h-5 w-5 text-green-600" />
                            Publish Job Post
                        </DialogTitle>
                        <DialogDescription>
                            Select the social media accounts to publish this job post to.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <p className="text-sm text-slate-600">
                            Connected accounts ({selectedAccounts.length} selected):
                        </p>

                        {connectedAccounts.map((account) => {
                            const Icon = account.icon;
                            const isSelected = selectedAccounts.includes(account.id);

                            return (
                                <div
                                    key={account.id}
                                    onClick={() => handleAccountToggle(account.id)}
                                    className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${isSelected
                                        ? 'border-green-300 bg-green-50'
                                        : 'border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => handleAccountToggle(account.id)}
                                    />
                                    <div className={`p-2 rounded-lg ${account.color} text-white`}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-slate-900">{account.name}</h4>
                                        <p className="text-sm text-slate-500">{account.handle}</p>
                                    </div>
                                    {isSelected && (
                                        <Check className="h-5 w-5 text-green-600" />
                                    )}
                                </div>
                            );
                        })}

                        {connectedAccounts.length === 0 && (
                            <div className="text-center py-6 text-slate-500">
                                <p>No accounts connected.</p>
                                <Link href="/dashboard/integrations" className="text-blue-600 hover:underline text-sm">
                                    Go to Integrations
                                </Link>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleFinalPublish}
                            disabled={isPublishing || selectedAccounts.length === 0}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isPublishing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Publishing...
                                </>
                            ) : (
                                <>
                                    <Rocket className="mr-2 h-4 w-4" />
                                    Publish to {selectedAccounts.length} Account{selectedAccounts.length !== 1 ? 's' : ''}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
