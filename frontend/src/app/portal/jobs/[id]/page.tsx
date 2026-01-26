"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Briefcase, ArrowLeft, CheckCircle2, Zap, Loader2 } from "lucide-react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    // const { toast } = useToast(); // Assuming standard shadcn toast hook

    const [isOpen, setIsOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        linkedin_url: "",
        resume_url: "",
    });

    const { data: job, isLoading, error } = useQuery({
        queryKey: ["job", id],
        queryFn: () => api.jobs.get(id),
    });

    const applyMutation = useMutation({
        mutationFn: api.applications.guestApply,
        onSuccess: (data) => {
            setIsOpen(false);
            // toast({ title: "Application Submitted", description: "Redirecting to interview..." });
            router.push(data.redirect_url);
        },
        onError: (err: any) => {
            console.error("Application failed", err);
            // toast({ title: "Error", description: err.message, variant: "destructive" });
            alert("Application failed: " + err.message);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyMutation.mutate({
            job_id: parseInt(id),
            ...formData,
            skills: [], // TODO: Add skills input
            experience_years: 0 // TODO: Add experience input
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (error || !job) {
        if (error instanceof ApiError && error.status === 404) notFound();
        return (
            <div className="min-h-screen flex items-center justify-center text-red-500">
                Error loading job details.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">

                {/* Back Link */}
                <Link href="/portal/jobs">
                    <Button variant="ghost" className="mb-6 pl-0 hover:pl-2 transition-all">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Jobs
                    </Button>
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-border p-8 md:p-12 shadow-xl"
                >
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-border pb-8 mb-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                    {job.department || 'Engineering'}
                                </Badge>
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <Clock className="w-3.5 h-3.5 mr-1" /> {new Date(job.created_at).toLocaleDateString()}
                                </div>
                            </div>

                            <h1 className="text-3xl md:text-5xl font-bold text-foreground">
                                {job.title}
                            </h1>

                            <div className="flex flex-wrap gap-6 text-muted-foreground">
                                <span className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-indigo-500" /> {job.location || 'Remote'}
                                </span>
                                <span className="flex items-center gap-2">
                                    <Briefcase className="w-5 h-5 text-indigo-500" /> {job.type || 'Full-time'}
                                </span>
                                <span className="flex items-center gap-2 font-semibold text-foreground">
                                    <Zap className="w-5 h-5 text-amber-500" /> {job.salary_range || 'Competitive'}
                                </span>
                            </div>
                        </div>

                        <div className="flex-shrink-0">
                            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                                <DialogTrigger asChild>
                                    <Button size="lg" className="w-full md:w-auto text-lg px-8 py-6 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105 transition-all shadow-lg hover:shadow-indigo-500/25">
                                        Apply & Start Interview
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Start Your Application</DialogTitle>
                                        <DialogDescription>
                                            Enter your details to begin the AI interview process immediately.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Full Name</Label>
                                            <Input
                                                id="name"
                                                required
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="linkedin">LinkedIn URL (Optional)</Label>
                                            <Input
                                                id="linkedin"
                                                value={formData.linkedin_url}
                                                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                                            />
                                        </div>
                                        {/* Resume Upload could go here, skipping for MVP/Text only */}

                                        <Button type="submit" className="w-full mt-2" disabled={applyMutation.isPending}>
                                            {applyMutation.isPending ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting...
                                                </>
                                            ) : (
                                                "Start Interview"
                                            )}
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-10">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                About the Role
                            </h2>
                            <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {job.description}
                            </p>
                        </section>

                        {job.requirements && job.requirements.length > 0 && (
                            <section className="space-y-4">
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    Requirements
                                </h2>
                                <ul className="grid gap-3">
                                    {job.requirements.map((req: string, i: number) => (
                                        <li key={i} className="flex items-start gap-3 text-muted-foreground">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" />
                                            <span>{req}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>

                </motion.div>
            </div>
        </div>
    );
}
