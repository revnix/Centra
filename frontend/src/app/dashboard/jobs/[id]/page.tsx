"use client";

import { use, useState } from "react";
import { useJob, usePublishJob, useCloseJob } from "@/lib/hooks/useJobs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Globe, Users, Archive, CheckCircle2, AlertCircle, MessageSquare, Rocket, Loader2, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { integrationsApi } from "@/lib/api/integrations";
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
    const { data: job, isLoading, error } = useJob(id);
    const publishMutation = usePublishJob();
    const closeMutation = useCloseJob();

    const [showPublishDialog, setShowPublishDialog] = useState(false);
    const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [isPublishing, setIsPublishing] = useState(false);

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
    const isDraft = job.status === "DRAFT";

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <Link href="/dashboard/jobs" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Jobs
                </Link>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">{job.title}</h1>
                        <div className="flex items-center gap-3 mt-2">
                            <Badge variant={isActive ? "default" : "secondary"} className="capitalize">
                                {job.status}
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
                                    onClick={() => {
                                        toast.info("Feedback feature coming soon! For now, you can edit the job directly.");
                                    }}
                                    className="border-slate-200 hover:bg-slate-50"
                                >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Suggest Improvements
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

                                            setConnectedAccounts(formatted);
                                            setSelectedAccounts(formatted.map(a => a.id));
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
                        <Button variant="outline">
                            <Edit className="w-4 h-4 mr-2" /> Edit
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

                    {job.requirements && job.requirements.length > 0 && (
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
                                <p className="font-medium">{job.salary_range || "Not specified"}</p>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Posted Date</h4>
                                <p className="font-medium">{job.created_at ? new Date(job.created_at).toLocaleDateString() : "N/A"}</p>
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
                                    onClick={() => {
                                        setSelectedAccounts(prev =>
                                            prev.includes(account.id)
                                                ? prev.filter(id => id !== account.id)
                                                : [...prev, account.id]
                                        );
                                    }}
                                    className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${isSelected
                                        ? 'border-green-300 bg-green-50'
                                        : 'border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => {
                                            setSelectedAccounts(prev =>
                                                prev.includes(account.id)
                                                    ? prev.filter(id => id !== account.id)
                                                    : [...prev, account.id]
                                            );
                                        }}
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
                            onClick={async () => {
                                setIsPublishing(true);
                                try {
                                    const publishPromises = selectedAccounts.map(async (accId) => {
                                        const account = connectedAccounts.find(a => a.id === accId);
                                        const jobUrl = `${window.location.origin}/jobs/${job.id}/apply`;

                                        if (account?.platform === 'linkedin') {
                                            const publishText = `${job.description}\n\nApply Now: ${jobUrl}`;
                                            return integrationsApi.linkedin.publish(publishText);
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
                                    toast.success("Job published successfully!");
                                    setShowPublishDialog(false);
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
