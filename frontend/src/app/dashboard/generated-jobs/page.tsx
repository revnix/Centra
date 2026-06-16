'use client'; // ✅ UNCHANGED

import { useState, useEffect, useMemo } from 'react'; // ✨ NEW - OPTIMIZATION (added useMemo)
import { useQuery } from '@tanstack/react-query'; // ✨ NEW - OPTIMIZATION
import { useJobs, usePublishJob, useDeleteJob } from '@/lib/hooks/useJobs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Calendar, ArrowRight, CheckCircle2, Loader2, Rocket, Briefcase, Linkedin, Check, Share2, Trash2, AlertTriangle } from 'lucide-react';
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
    const { data: jobsResponse, isLoading } = useJobs();
    const publishJob = usePublishJob();

    const jobs = jobsResponse?.filter(j => ['DRAFT', 'APPROVED', 'CHANGES_REQUESTED', 'PUBLISHED', 'ACTIVE'].includes(j.status)) || [];

    // Publish Dialog State // ✅ UNCHANGED
    const [showPublishDialog, setShowPublishDialog] = useState(false); // ✅ UNCHANGED
    const [selectedJob, setSelectedJob] = useState<any>(null); // ✅ UNCHANGED
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]); // ✅ UNCHANGED
    const [isPublishing, setIsPublishing] = useState(false); // ✅ UNCHANGED

    // Feedback Dialog State // ✅ UNCHANGED
    const [showFeedbackDialog, setShowFeedbackDialog] = useState(false); // ✅ UNCHANGED
    const [feedbackToShow, setFeedbackToShow] = useState(""); // ✅ UNCHANGED

    // Delete Dialog State
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [jobToDelete, setJobToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const deleteJob = useDeleteJob();

    // Multi-select State (none selected by default)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    const allSelected = jobs.length > 0 && selectedIds.size === jobs.length;
    const someSelected = selectedIds.size > 0 && !allSelected;

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(jobs.map(j => j.id)));
        }
    };

    const handleBulkDelete = async () => {
        setIsBulkDeleting(true);
        try {
            await Promise.all([...selectedIds].map(id => deleteJob.mutateAsync(id)));
            toast.success(`${selectedIds.size} job${selectedIds.size > 1 ? 's' : ''} deleted successfully.`);
            setSelectedIds(new Set());
            setShowBulkDeleteDialog(false);
        } catch (error: any) {
            toast.error(`Bulk delete failed: ${error.message || 'Unknown error'}`);
        } finally {
            setIsBulkDeleting(false);
        }
    };

    // ✨ NEW - OPTIMIZATION: cached integrations fetch (5 min stale time).
    // Previously fired a fresh network call every mount; now instant on revisit.
    const { data: rawIntegrations = [] } = useQuery({
        queryKey: ['integrations', 'list'],
        queryFn: () => integrationsApi.list(),
        staleTime: 5 * 60 * 1000, // 5 minutes — integrations rarely change
    });

    // ✨ NEW - OPTIMIZATION: derive connectedAccounts from cached data (replaces useState + useEffect).
    // Same mapping + deduplication logic as before, now in useMemo so it reacts to cache updates.
    const connectedAccounts = useMemo<ConnectedAccount[]>(() => {
        if (!Array.isArray(rawIntegrations)) return [];

        const formatted = rawIntegrations.map((int: any) => {
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

        // Deduplicate by platform // ✅ UNCHANGED LOGIC
        const uniquePlatforms = new Map<string, ConnectedAccount>();
        formatted.forEach(acc => {
            if (!uniquePlatforms.has(acc.platform)) {
                uniquePlatforms.set(acc.platform, acc);
            }
        });
        return Array.from(uniquePlatforms.values());
    }, [rawIntegrations]);

    // ✨ NEW - OPTIMIZATION: auto-select all accounts whenever the cached list updates.
    // Replaces the setConnectedAccounts + setSelectedAccounts calls that were inside useEffect.
    useEffect(() => {
        if (connectedAccounts.length > 0) {
            setSelectedAccounts(connectedAccounts.map(a => a.id));
        }
    }, [connectedAccounts]);

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

    const handleDeleteClick = (job: any) => {
        setJobToDelete(job);
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        if (!jobToDelete) return;
        setIsDeleting(true);
        try {
            await deleteJob.mutateAsync(jobToDelete.id);
            toast.success(`"${jobToDelete.title}" has been deleted.`);
            setShowDeleteDialog(false);
            setJobToDelete(null);
        } catch (error: any) {
            toast.error(`Failed to delete: ${error.message || 'Unknown error'}`);
        } finally {
            setIsDeleting(false);
        }
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
                {jobs.length > 0 && (
                    <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition-all duration-200"
                    >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            allSelected ? 'bg-indigo-600 border-indigo-600' : someSelected ? 'border-indigo-400' : 'border-slate-300'
                        }`}>
                            {allSelected && <Check className="h-3 w-3 text-white" />}
                            {someSelected && <div className="w-2 h-0.5 bg-indigo-400 rounded" />}
                        </div>
                        {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                )}
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
                <div className="grid grid-cols-1 gap-4">
                    {jobs.map((job) => {
                        const isChecked = selectedIds.has(job.id);
                        return (
                        <Card
                            key={job.id}
                            className={`group transition-all duration-200 overflow-hidden ${
                                isChecked
                                    ? 'border-indigo-400 shadow-md shadow-indigo-100 ring-1 ring-indigo-300'
                                    : 'border-slate-200 hover:shadow-lg hover:border-indigo-100'
                            }`}
                        >
                            <div className="flex flex-col md:flex-row md:items-center gap-6 p-6">
                                {/* Checkbox */}
                                <div
                                    onClick={() => toggleSelect(job.id)}
                                    className={`flex-shrink-0 cursor-pointer w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150 ${
                                        isChecked
                                            ? 'bg-indigo-600 border-indigo-600'
                                            : 'border-slate-300 hover:border-indigo-400'
                                    }`}
                                >
                                    {isChecked && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0 space-y-3">
                                    <div className="flex items-start justify-between md:justify-start gap-4">
                                        <h3 className="text-xl font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                                            {job.title}
                                        </h3>
                                        {/* Status Badge */}
                                        <div className="flex gap-2">
                                            <Badge 
                                                variant={
                                                    job.status === "APPROVED" ? "outline" : 
                                                    job.status === "CHANGES_REQUESTED" ? "destructive" : 
                                                    "secondary"
                                                } 
                                                className={`capitalize ${job.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : ''}`}
                                            >
                                                {job.status.toLowerCase().replace('_', ' ')}
                                            </Badge>
                                            {job.manager_feedback && (
                                                <Badge 
                                                    variant="outline" 
                                                    className="bg-orange-50 text-orange-700 border-orange-100 cursor-pointer hover:bg-orange-100 transition-colors"
                                                    onClick={() => {
                                                        setFeedbackToShow(job.manager_feedback ?? "");
                                                        setShowFeedbackDialog(true);
                                                    }}
                                                >
                                                    Feedback Available
                                                </Badge>
                                            )}
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
                                    <Button
                                        variant="outline"
                                        onClick={() => handleDeleteClick(job)}
                                        className="whitespace-nowrap border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 gap-2"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </Card>
                        );
                    })}
                </div>
            )}

            {/* ── Floating Bulk Action Bar ── */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-4 px-6 py-3.5 bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-900/40 border border-slate-700">
                        <span className="text-sm font-medium">
                            <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full mr-2">{selectedIds.size}</span>
                            job{selectedIds.size > 1 ? 's' : ''} selected
                        </span>
                        <div className="w-px h-5 bg-slate-600" />
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            Clear
                        </button>
                        <button
                            onClick={() => setShowBulkDeleteDialog(true)}
                            className="flex items-center gap-2 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-xl transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete {selectedIds.size > 1 ? `${selectedIds.size} Jobs` : 'Job'}
                        </button>
                    </div>
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

            {/* Manager Feedback Dialog */}
            <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Share2 className="h-5 w-5 text-orange-600" />
                            Manager Feedback
                        </DialogTitle>
                        <DialogDescription>
                            Suggestions and changes requested by the Operation Manager.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6">
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-5 text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {feedbackToShow || "No feedback provided."}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
                            Close
                        </Button>
                        <Button 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={() => {
                                setShowFeedbackDialog(false);
                                // Redirect to edit/review details
                                const jobId = jobs.find(j => j.manager_feedback === feedbackToShow)?.id;
                                if (jobId) router.push(`/dashboard/jobs/${jobId}`);
                            }}
                        >
                            View & Edit Job
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Job Post
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to permanently delete{" "}
                            <span className="font-semibold text-slate-800">"{jobToDelete?.title}"</span>?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Permanently
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Bulk Delete Confirmation ── */}
            <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Delete {selectedIds.size} Job{selectedIds.size > 1 ? 's' : ''}
                        </DialogTitle>
                        <DialogDescription>
                            You are about to permanently delete{' '}
                            <span className="font-semibold text-slate-800">{selectedIds.size} job posting{selectedIds.size > 1 ? 's' : ''}</span>.
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-3 px-4 bg-red-50 border border-red-100 rounded-xl">
                        <ul className="space-y-1 max-h-40 overflow-y-auto">
                            {jobs.filter(j => selectedIds.has(j.id)).map(j => (
                                <li key={j.id} className="text-sm text-red-700 flex items-center gap-2">
                                    <Trash2 className="h-3 w-3 flex-shrink-0" />
                                    {j.title}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)} disabled={isBulkDeleting}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isBulkDeleting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
                            ) : (
                                <><Trash2 className="mr-2 h-4 w-4" /> Delete {selectedIds.size} Job{selectedIds.size > 1 ? 's' : ''}</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
