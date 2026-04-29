"use client";

import { use, useState, useEffect } from "react";
import { useJob, useReviewJob } from "@/lib/hooks/useJobs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, AlertCircle, MessageSquare, Loader2, ThumbsUp, ThumbsDown, Send, FileText, MapPin, Briefcase, Building } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function JobReviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: job, isLoading, error } = useJob(id);
    const reviewMutation = useReviewJob();

    const [feedback, setFeedback] = useState("");
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [action, setAction] = useState<'APPROVED' | 'CHANGES_REQUESTED' | null>(null);

    useEffect(() => {
        if (job?.manager_feedback) {
            setFeedback(job.manager_feedback);
        }
    }, [job]);

    const handleSubmit = async (status: 'APPROVED' | 'CHANGES_REQUESTED') => {
        if (status === 'CHANGES_REQUESTED' && !feedback.trim()) {
            toast.error("Please provide feedback for the requested changes.");
            return;
        }

        try {
            await reviewMutation.mutateAsync({
                jobId: id,
                status,
                feedback: feedback.trim() || undefined
            });
            
            setAction(status);
            setIsSubmitted(true);
            toast.success(status === 'APPROVED' ? "Job approved successfully!" : "Changes requested successfully!");
        } catch (error: any) {
            toast.error(`Failed to submit review: ${error.message || "Unknown error"}`);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-3xl w-full space-y-6">
                    <Skeleton className="h-12 w-3/4 mx-auto" />
                    <Skeleton className="h-[500px] w-full rounded-2xl" />
                </div>
            </div>
        );
    }

    if (error || !job) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
                <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full border border-slate-200">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Link Invalid or Expired</h2>
                    <p className="text-slate-600 mb-6">We couldn't find the job post you're looking for. It might have been deleted or the link is incorrect.</p>
                </div>
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full border border-slate-100"
                >
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${action === 'APPROVED' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                        {action === 'APPROVED' ? <CheckCircle2 className="w-10 h-10" /> : <MessageSquare className="w-10 h-10" />}
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-3">
                        {action === 'APPROVED' ? 'Job Approved!' : 'Feedback Sent'}
                    </h2>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        {action === 'APPROVED' 
                            ? 'Thank you for your review. The recruitment team has been notified and can now proceed with publishing the post.' 
                            : 'Your feedback has been sent to the recruitment team. They will update the job post and notify you when it\'s ready for another review.'}
                    </p>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-500 italic">
                        "This review was submitted by the Operation Manager"
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Top Navigation / Progress */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">E</div>
                        <span className="font-bold text-slate-900 tracking-tight">Evalyn AI <span className="text-slate-400 font-normal">| Review Portal</span></span>
                    </div>
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 px-3 py-1">
                        Operation Manager View
                    </Badge>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 pt-10">
                <div className="grid grid-cols-1 gap-8">
                    {/* Job Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card className="border-none shadow-sm overflow-hidden rounded-2xl">
                            <CardHeader className="bg-white border-b border-slate-50 p-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-3xl font-bold text-slate-900 leading-tight">
                                            {job.title}
                                        </CardTitle>
                                        <div className="flex flex-wrap items-center gap-4 mt-4">
                                            <div className="flex items-center text-slate-500 text-sm">
                                                <Building className="w-4 h-4 mr-1.5 text-slate-400" />
                                                {job.department || "General"}
                                            </div>
                                            <div className="flex items-center text-slate-500 text-sm">
                                                <MapPin className="w-4 h-4 mr-1.5 text-slate-400" />
                                                {job.location || "Remote"}
                                            </div>
                                            <div className="flex items-center text-slate-500 text-sm">
                                                <Briefcase className="w-4 h-4 mr-1.5 text-slate-400" />
                                                {job.type || "Full-time"}
                                            </div>
                                        </div>
                                    </div>
                                    <Badge className="w-fit h-fit px-4 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-100 border-none capitalize text-sm font-medium">
                                        {job.status.toLowerCase().replace('_', ' ')}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 bg-white">
                                <div className="space-y-8">
                                    <section>
                                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                                            <FileText className="w-5 h-5 mr-2 text-indigo-500" />
                                            Job Description
                                        </h3>
                                        <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-6 rounded-xl border border-slate-100">
                                            {job.description}
                                        </div>
                                    </section>

                                    {job.requirements && job.requirements.length > 0 && (
                                        <section>
                                            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                                                <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />
                                                Key Requirements
                                            </h3>
                                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {job.requirements.map((req, idx) => (
                                                    <li key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-100 text-slate-600 text-sm">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                                                        {req}
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Review Form */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="border-none shadow-lg rounded-2xl overflow-hidden">
                            <CardHeader className="bg-slate-900 text-white p-8">
                                <CardTitle className="text-xl">Your Review</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Provide feedback or approve this post for publication.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 bg-white space-y-6">
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-indigo-500" />
                                        Feedback & Suggestions
                                    </label>
                                    <Textarea 
                                        placeholder="Add any changes you'd like to see, or leave empty if approving..."
                                        className="min-h-[120px] focus:ring-indigo-500 border-slate-200 rounded-xl resize-none"
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                    />
                                    <p className="text-xs text-slate-400 italic">
                                        * Feedback is required if you are requesting changes.
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                    <Button
                                        size="lg"
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-14 rounded-xl shadow-lg shadow-green-100 transition-all active:scale-[0.98]"
                                        onClick={() => handleSubmit('APPROVED')}
                                        disabled={reviewMutation.isPending}
                                    >
                                        {reviewMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ThumbsUp className="w-5 h-5 mr-2" />}
                                        Approve Post
                                    </Button>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="flex-1 border-slate-200 text-slate-700 font-bold h-14 rounded-xl hover:bg-slate-50 transition-all active:scale-[0.98]"
                                        onClick={() => handleSubmit('CHANGES_REQUESTED')}
                                        disabled={reviewMutation.isPending}
                                    >
                                        {reviewMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ThumbsDown className="w-5 h-5 mr-2" />}
                                        Request Changes
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </main>

            <footer className="max-w-4xl mx-auto px-4 mt-12 text-center text-slate-400 text-sm">
                <p>&copy; 2026 Evalyn AI Recruitment Platform. All rights reserved.</p>
                <p className="mt-1">Internal Use Only • Operation Manager Review System</p>
            </footer>
        </div>
    );
}
