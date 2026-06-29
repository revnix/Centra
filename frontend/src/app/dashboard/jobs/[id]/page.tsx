"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useJob, usePublishJob, useCloseJob, useAcceptEdit, useDeclineEdit } from "@/lib/hooks/useJobs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Globe, Users, Archive, CheckCircle2, AlertCircle, MessageSquare, Rocket, Loader2, Check, RefreshCw, Calendar, Share2, X, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { integrationsApi } from "@/lib/api/integrations";
import { jobsApi } from "@/lib/api/jobs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";


interface ConnectedAccount {
    id: string;
    platform: 'linkedin' | 'twitter' | 'facebook' | 'indeed';
    name: string;
    handle: string;
    icon: any;
    color: string;
}

export default function DashboardJobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { data: job, isLoading, error, refetch: refetchJob } = useJob(id);
    const publishMutation = usePublishJob();
    const closeMutation = useCloseJob();
    const acceptEditMutation = useAcceptEdit();
    const declineEditMutation = useDeclineEdit();

    const [showPublishDialog, setShowPublishDialog] = useState(false);
    const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishSuccess, setPublishSuccess] = useState(false);

    // Feedback & Edit states
    const [showImproveDialog, setShowImproveDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [isImproving, setIsImproving] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Send to Team Dialog State
    const [showTeamDialog, setShowTeamDialog] = useState(false);
    const [selectedTeamEmails, setSelectedTeamEmails] = useState<string[]>([]);
    const [isSendingToTeam, setIsSendingToTeam] = useState(false);
    const [customEmail, setCustomEmail] = useState("");

    // Prefetch team members on mount so the dialog opens instantlys
    const { data: teamMembers = [] } = useQuery({
        queryKey: ['team-members'],
        queryFn: () => jobsApi.getTeamMembers(),
        staleTime: 10 * 60 * 1000,
    });

    const handleOpenTeamDialog = () => {
        setSelectedTeamEmails([]);
        setCustomEmail("");
        setShowTeamDialog(true);
    };

    const handleSendToTeam = async () => {
        if (!job) return;

        const allEmails = [...selectedTeamEmails];
        if (customEmail.trim()) {
            // Basic email validation
            if (!/^\S+@\S+\.\S+$/.test(customEmail.trim())) {
                toast.error("Please enter a valid custom email address");
                return;
            }
            allEmails.push(customEmail.trim());
        }

        if (allEmails.length === 0) {
            toast.error("Please select at least one team member or enter a custom email");
            return;
        }

        setIsSendingToTeam(true);
        try {
            const result = await jobsApi.sendToTeam(id, allEmails);
            toast.success(result.message);
            setShowTeamDialog(false);
        } catch (error: any) {
            toast.error(`Failed to send: ${error.message || "Unknown error"}`);
        } finally {
            setIsSendingToTeam(false);
        }
    };

    // Extend Deadline State
    const [showExtendDialog, setShowExtendDialog] = useState(false);
    const [newDeadline, setNewDeadline] = useState("");
    const [isExtending, setIsExtending] = useState(false);

    // Edit Form State
    const [editForm, setEditForm] = useState({
        title: "",
        description: "",
        location: "",
        department: ""
    });

    const openEditDialog = () => {
        if (job) {
            setEditForm({
                title: job.title || "",
                description: job.description || "",
                location: job.location || "",
                department: job.department || ""
            });
            setShowEditDialog(true);
        }
    };

    const handleImprove = async () => {
        if (!feedback.trim()) return;
        setIsImproving(true);
        try {
            await jobsApi.improve(id, feedback);
            toast.success("Job improved successfully!");
            setShowImproveDialog(false);
            setFeedback("");
            refetchJob();
        } catch (error: any) {
            toast.error(`Failed to improve job: ${error.message || "Unknown error"}`);
        } finally {
            setIsImproving(false);
        }
    };

    const handleManualSave = async () => {
        setIsUpdating(true);
        try {
            await jobsApi.update(id, editForm);
            toast.success("Job updated successfully!");
            setShowEditDialog(false);
            refetchJob();
        } catch (error: any) {
            toast.error(`Failed to update job: ${error.message || "Unknown error"}`);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleExtendDeadline = async () => {
        if (!newDeadline) return;
        setIsExtending(true);
        try {
            const expiresAt = new Date(newDeadline);
            expiresAt.setHours(23, 59, 59, 999);
            await jobsApi.extendDeadline(id, expiresAt.toISOString());
            toast.success("Deadline extended successfully!");
            setShowExtendDialog(false);
            refetchJob();
        } catch (error: any) {
            toast.error(`Failed to extend deadline: ${error.message || "Unknown error"}`);
        } finally {
            setIsExtending(false);
        }
    };

    const handleAcceptEdit = async () => {
        try {
            await acceptEditMutation.mutateAsync(id);
            toast.success("Edits accepted! The job post has been updated.");
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error: any) {
            toast.error(`Failed to accept edits: ${error.message || "Unknown error"}`);
        }
    };

    const handleDeclineEdit = async (declineFeedback: string) => {
        try {
            await declineEditMutation.mutateAsync({ jobId: id, feedback: declineFeedback });
            toast.success("Edits declined. Feedback has been sent.");
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error: any) {
            toast.error(`Failed to decline edits: ${error.message || "Unknown error"}`);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    if (error || !job) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
                <p className="text-muted-foreground mb-6">The job you are looking for could not be found or has been deleted.</p>
                <Link href="/dashboard/jobs">
                    <Button variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Jobs
                    </Button>
                </Link>
            </div>
        );
    }

    const isActive = job.status === "PUBLISHED";
    const isDraft = !isActive; // show all action buttons for any non-published status

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Proposed Edits Alert */}
            {job.status === 'EDIT_SUBMITTED' && (
                <Alert className="bg-indigo-50 border-indigo-200 text-indigo-900 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500 rounded-2xl border-2">
                    <Edit className="h-6 w-6 text-indigo-600 mt-1" />
                    <AlertDescription className="ml-2 w-full">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-indigo-100">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge className="bg-indigo-600 text-white hover:bg-indigo-600 animate-pulse">PROPOSED EDITS</Badge>
                                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Action Required</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mt-1">Review Proposed Changes</h3>
                                <p className="text-slate-600 mt-1 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-slate-400" />
                                    Submitted by: <span className="font-semibold text-indigo-700">{job.edited_by_email || 'A Team Member'}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    size="lg"
                                    className="bg-green-600 hover:bg-green-700 text-white px-8 shadow-md transition-all active:scale-95"
                                    onClick={handleAcceptEdit}
                                    disabled={acceptEditMutation.isPending}
                                >
                                    {acceptEditMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
                                    Accept Edits & Update Post
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="border-red-200 text-red-600 hover:bg-red-50 px-8 transition-all active:scale-95"
                                    onClick={() => {
                                        const feedback = window.prompt("Reason for declining (optional):");
                                        if (feedback !== null) handleDeclineEdit(feedback);
                                    }}
                                    disabled={declineEditMutation.isPending}
                                >
                                    {declineEditMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <X className="w-5 h-5 mr-2" />}
                                    Decline Edits
                                </Button>
                            </div>
                        </div>

                        <div className="mt-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                        Current Title
                                    </h4>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-sm">
                                        {job.title}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold text-indigo-500 uppercase flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                        Proposed Title
                                    </h4>
                                    <div className="p-4 bg-white rounded-xl border-2 border-indigo-200 text-indigo-900 font-bold text-md shadow-sm">
                                        {job.edited_title || job.title}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-bold text-indigo-500 uppercase flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Proposed Description
                                </h4>
                                <div className="text-sm bg-white p-6 rounded-xl border-2 border-indigo-100 max-h-[400px] overflow-y-auto whitespace-pre-wrap text-slate-700 leading-relaxed shadow-sm">
                                    {job.edited_description || job.description}
                                </div>
                            </div>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Success Alert for Approved with Edits */}
            {job.status === 'APPROVED' && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl animate-in fade-in zoom-in duration-300">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <p className="font-bold text-green-900">Post Content Updated</p>
                        <p className="text-sm text-green-700">The proposed edits have been accepted and the job post is now up to date.</p>
                    </div>
                </div>
            )}

            {/* Success Alert for Declined Edits */}
            {job.status === 'EDIT_DECLINED' && job.manager_feedback && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl animate-in fade-in zoom-in duration-300">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <X className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <p className="font-bold text-red-900">Edit Decline</p>
                        <p className="text-sm text-red-700">The edits were rejected. Feedback: "{job.manager_feedback}"</p>
                    </div>
                </div>
            )}

            {/* Manager Feedback Alert */}
            {job.manager_feedback && (
                <Alert className="bg-orange-50 border-orange-200 text-orange-900 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                    <MessageSquare className="h-5 w-5 text-orange-600" />
                    <AlertDescription className="ml-2 flex flex-col gap-1">
                        <span className="font-bold text-orange-800 text-sm uppercase tracking-wider">Operation Manager Feedback:</span>
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {job.manager_feedback}
                        </p>
                    </AlertDescription>
                </Alert>
            )}

            {/* Header */}
            <div>
                <Link href="/dashboard/jobs" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Jobs
                </Link>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">{job.title}</h1>
                        <div className="flex items-center gap-3 mt-2">
                            <Badge
                                variant={
                                    job.status === "PUBLISHED" ? "default" :
                                        job.status === "APPROVED" ? "outline" :
                                            job.status === "CHANGES_REQUESTED" ? "destructive" :
                                                job.status === "EDIT_SUBMITTED" ? "secondary" :
                                                    "secondary"
                                }
                                className={`capitalize ${job.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : ''} ${job.status === 'EDIT_SUBMITTED' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}`}
                            >
                                {job.status.toLowerCase().replace('_', ' ')}
                            </Badge>
                            <span className="text-muted-foreground text-sm">•</span>
                            <span className="text-muted-foreground text-sm">{job.department || "No Department"}</span>
                            <span className="text-muted-foreground text-sm">•</span>
                            <span className="text-muted-foreground text-sm">{job.location || "Remote"}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isDraft && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowImproveDialog(true)}
                                    className="border-slate-200 hover:bg-slate-50"
                                >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Suggest Improvements
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleOpenTeamDialog}
                                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                >
                                    <Users className="w-4 h-4 mr-2" />
                                    Send to Team
                                </Button>
                                <Button
                                    onClick={async () => {
                                        try {
                                            const integrations = await integrationsApi.list();
                                            const formatted = integrations.map((int: any) => {
                                                const platform = int.platform.toLowerCase().trim();
                                                if (platform === 'linkedin') {
                                                    return {
                                                        id: int.id.toString(),
                                                        platform: 'linkedin' as const,
                                                        name: 'LinkedIn Account',
                                                        handle: int.platform_user_id || 'Connected',
                                                        icon: Globe,
                                                        color: 'bg-blue-600',
                                                    };
                                                } else if (platform === 'indeed') {
                                                    return {
                                                        id: int.id.toString(),
                                                        platform: 'indeed' as const,
                                                        name: 'Indeed Account',
                                                        handle: int.platform_user_id || 'Connected',
                                                        icon: Globe,
                                                        color: 'bg-blue-600',
                                                    };
                                                }
                                                return null;
                                            }).filter(Boolean) as ConnectedAccount[];

                                            // Deduplicate: keep only first entry per platform
                                            const seen = new Map<string, ConnectedAccount>();
                                            formatted.forEach(acc => {
                                                if (!seen.has(acc.platform)) seen.set(acc.platform, acc);
                                            });
                                            const deduped = Array.from(seen.values());

                                            setConnectedAccounts(deduped);
                                            setSelectedAccounts(deduped.map(a => a.id));
                                            setShowPublishDialog(true);
                                        } catch (error) {
                                            toast.error("Failed to load integrations");
                                        }
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    <Rocket className="w-4 h-4 mr-2" />
                                    Launch Job Post
                                </Button>

                            </>
                        )}
                        {isActive && (
                            <div className="flex gap-2">
                                <Link href={`/jobs/${job.id}`} target="_blank">
                                    <Button variant="outline">
                                        <Globe className="w-4 h-4 mr-2" /> View Live
                                    </Button>
                                </Link>
                                <Link href={`/jobs/${job.id}/apply`} target="_blank">
                                    <Button variant="outline">
                                        <Rocket className="w-4 h-4 mr-2" /> Apply Now (Test)
                                    </Button>
                                </Link>
                            </div>
                        )}
                        <Button variant="outline" onClick={openEditDialog}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Button variant="outline" onClick={() => setShowExtendDialog(true)}>
                            <Calendar className="w-4 h-4 mr-2" /> Extend Deadline
                        </Button>
                        <Link href={`/dashboard/jobs/${job.id}/candidates`}>
                            <Button variant="secondary">
                                <Users className="w-4 h-4 mr-2" /> Candidates
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Description</CardTitle>
                        </CardHeader>
                        <CardContent className="prose dark:prose-invert max-w-none">
                            <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                                {job.description}
                            </p>
                        </CardContent>
                    </Card>

                    {job.requirements && job.requirements.length > 0 && !job.description?.includes('🔹') && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Requirements</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                    {job.requirements.map((req: string, i: number) => (
                                        <li key={i}>{req}</li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Job Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Employment Type</h4>
                                <p className="font-medium">{job.type || "Full-time"}</p>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Salary Range</h4>
                                <p className="font-medium">
                                    {job.salary_range || (job.salary_min && job.salary_max
                                        ? `${job.salary_currency || 'PKR'} ${job.salary_min.toLocaleString()} – ${job.salary_max.toLocaleString()} per ${job.salary_period?.replace('ly', '') || 'month'}`
                                        : "Salary Not Specified")}
                                </p>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Posted Date</h4>
                                <p className="font-medium">{job.created_at ? new Date(job.created_at).toLocaleDateString() : "N/A"}</p>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Deadline</h4>
                                <p className="font-medium">{job.expires_at ? new Date(job.expires_at).toLocaleDateString() : "No Deadline Set"}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Hiring Team
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                    HR
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Hiring Manager</p>
                                    <p className="text-xs text-muted-foreground">Admin</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {isActive && (
                        <Card className="border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10">
                            <CardContent className="pt-6">
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={() => closeMutation.mutate(job.id)}
                                    disabled={closeMutation.isPending}
                                >
                                    <Archive className="w-4 h-4 mr-2" />
                                    {closeMutation.isPending ? "Closing..." : "Close Job Posting"}
                                </Button>
                                <p className="text-xs text-center text-muted-foreground mt-2">
                                    No longer accepting applications
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Publish Dialog - Account Selection / Success */}
            <Dialog open={showPublishDialog} onOpenChange={(open) => { setShowPublishDialog(open); if (!open) setPublishSuccess(false); }}>
                <DialogContent className="sm:max-w-md">
                    {publishSuccess ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle2 className="h-10 w-10 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Job Published!</h2>
                            <p className="text-slate-500 text-sm max-w-xs">
                                <span className="font-semibold text-slate-700">{job.title}</span> has been published successfully to the selected platforms.
                            </p>
                            <Button
                                className="mt-2 bg-green-600 hover:bg-green-700 text-white px-8"
                                onClick={() => setShowPublishDialog(false)}
                            >
                                Done
                            </Button>
                        </div>
                    ) : (
                        <>
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
                                    const toggle = () => setSelectedAccounts(prev =>
                                        prev.includes(account.id) ? prev.filter(id => id !== account.id) : [...prev, account.id]
                                    );
                                    return (
                                        <div
                                            key={account.id}
                                            onClick={toggle}
                                            className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            <Checkbox checked={isSelected} onCheckedChange={toggle} />
                                            <div className={`p-2 rounded-lg ${account.color} text-white`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-medium text-slate-900">{account.name}</h4>
                                                <p className="text-sm text-slate-500">{account.handle}</p>
                                            </div>
                                            {isSelected && <Check className="h-5 w-5 text-green-600" />}
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
                                    onClick={async () => {
                                        setIsPublishing(true);
                                        try {
                                            const jobUrl = `${window.location.origin}/jobs/${job.id}/apply`;
                                            const publishPromises = selectedAccounts.map(async (accId) => {
                                                const account = connectedAccounts.find(a => a.id === accId);
                                                if (account?.platform === 'linkedin') {
                                                    const snippet = (job.short_description || job.description || '').substring(0, 500).trimEnd();
                                                    const tag = `#${(job.title || '').replace(/\s+/g, '')}`;
                                                    const linkedInText = `🚀 We're Hiring: ${job.title}!\n\n📍 ${job.location || 'Remote'} | 💼 ${job.job_type || 'Full-time'} | 🏢 ${job.department || 'Engineering'}\n\n${snippet}${snippet.length >= 500 ? '...' : ''}\n\n👉 Apply Now: ${jobUrl}\n\n#Hiring #Jobs ${tag}`;
                                                    return integrationsApi.linkedin.publish(linkedInText, jobUrl);
                                                } else if (account?.platform === 'indeed') {
                                                    return integrationsApi.indeed.postJob({
                                                        title: job.title,
                                                        description: `${job.description}\n\nApply Now: ${jobUrl}`,
                                                        location: job.location || 'Remote',
                                                        company: job.company_name || job.department || 'Our Company'
                                                    });
                                                }
                                            });
                                            await Promise.all(publishPromises);
                                            setPublishSuccess(true);
                                            router.refresh();
                                        } catch (error: any) {
                                            const detail = error.response?.data?.detail;
                                            const message = typeof detail === 'string' ? detail : (error.message || "Unknown error");
                                            toast.error(`Failed to publish: ${message}`);
                                        } finally {
                                            setIsPublishing(false);
                                        }
                                    }}
                                    disabled={isPublishing || selectedAccounts.length === 0}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {isPublishing ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publishing...</>
                                    ) : (
                                        <><Rocket className="mr-2 h-4 w-4" />Publish to {selectedAccounts.length} Account{selectedAccounts.length !== 1 ? 's' : ''}</>
                                    )}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Send to Team Dialog */}
            <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Share2 className="h-5 w-5 text-indigo-600" />
                            Send to Team
                        </DialogTitle>
                        <DialogDescription>
                            Select team members to send this job post for review. None are selected by default.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-slate-700">Team Members</p>
                            {teamMembers.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">No team members configured.</p>
                            ) : (
                                teamMembers.map((member) => {
                                    const isSelected = selectedTeamEmails.includes(member.email);
                                    return (
                                        <div
                                            key={member.email}
                                            onClick={() => setSelectedTeamEmails(prev =>
                                                prev.includes(member.email)
                                                    ? prev.filter(e => e !== member.email)
                                                    : [...prev, member.email]
                                            )}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                className="pointer-events-none"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-900 text-sm">{member.label}</p>
                                                <p className="text-xs text-slate-500 truncate">{member.email}</p>
                                            </div>
                                            {isSelected && <Check className="h-4 w-4 text-indigo-600 flex-shrink-0" />}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Custom Email Address</label>
                                <div className="relative">
                                    <MessageSquare className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="e.g. manager@company.com"
                                        className="pl-10"
                                        value={customEmail}
                                        onChange={(e) => setCustomEmail(e.target.value)}
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500">Enter a specific email to send the review request to.</p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowTeamDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSendToTeam}
                            disabled={isSendingToTeam || (selectedTeamEmails.length === 0 && !customEmail.trim())}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isSendingToTeam ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                            ) : (
                                <><Share2 className="mr-2 h-4 w-4" />Send to {selectedTeamEmails.length > 0 ? `${selectedTeamEmails.length} ` : ''}{selectedTeamEmails.length === 1 ? 'Member' : selectedTeamEmails.length > 1 ? 'Members' : 'Team'}</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Suggest Improvement Dialog */}
            <Dialog open={showImproveDialog} onOpenChange={setShowImproveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-indigo-600" />
                            Suggest Improvements
                        </DialogTitle>
                        <DialogDescription>
                            What would you like the AI agent to change in this job post?
                            Provide feedback and it will automatically regenerate the post.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="e.g. Add more detail about the tech stack, make the requirements more senior, or change the tone to be more creative..."
                            className="min-h-[150px]"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowImproveDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleImprove}
                            className="bg-indigo-600 hover:bg-indigo-700"
                            disabled={isImproving || !feedback.trim()}
                        >
                            {isImproving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Improving...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Update Job
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manual Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="w-5 h-5 text-indigo-600" />
                            Edit Job Post
                        </DialogTitle>
                        <DialogDescription>
                            Manually update the job post details. These changes will be reflected immediately.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 overflow-y-auto flex-1 pr-1">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Job Title</label>
                            <Input
                                value={editForm.title}
                                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Location</label>
                            <Input
                                value={editForm.location}
                                onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Department</label>
                            <Input
                                value={editForm.department}
                                onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                                className="min-h-[200px]"
                                value={editForm.description}
                                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter className="shrink-0">
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleManualSave}
                            className="bg-indigo-600 hover:bg-indigo-700"
                            disabled={isUpdating}
                        >
                            {isUpdating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Extend Deadline Dialog */}
            <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-600" />
                            Extend Deadline
                        </DialogTitle>
                        <DialogDescription>
                            Set a new deadline for this job posting. This will reopen the job if it has expired.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <label className="text-sm font-medium">New Application Deadline</label>
                        <Input
                            type="date"
                            value={newDeadline}
                            onChange={(e) => setNewDeadline(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowExtendDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleExtendDeadline}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            disabled={isExtending || !newDeadline}
                        >
                            {isExtending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Extending...
                                </>
                            ) : (
                                "Extend Deadline"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
