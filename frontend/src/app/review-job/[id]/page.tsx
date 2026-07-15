"use client";

import { use, useState } from "react";
import { useJob, useReviewJob, useSubmitEdit } from "@/lib/hooks/useJobs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, AlertCircle, MessageSquare, Loader2, ThumbsUp, ThumbsDown, Send, FileText, MapPin, Briefcase, Building, Edit3, Save, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function JobReviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: job, isLoading, error } = useJob(id);
    const reviewMutation = useReviewJob();
    const submitEditMutation = useSubmitEdit();

    const [feedback, setFeedback] = useState("");
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [action, setAction] = useState<'APPROVED' | 'CHANGES_REQUESTED' | 'EDITED' | null>(null);

    // Edit states
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState("");
    const [editedDescription, setEditedDescription] = useState("");
    const [editorEmail, setEditorEmail] = useState("");

    // Intentionally not pre-filling feedback — each reviewer starts fresh

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

    const handleStartEdit = () => {
        if (!job) return;
        setEditedTitle(job.title);
        setEditedDescription(job.description);
        setIsEditing(true);
    };

    const handleSubmitEdit = async () => {
        if (!editedTitle.trim() || !editedDescription.trim()) {
            toast.error("Title and description cannot be empty.");
            return;
        }

        try {
            await submitEditMutation.mutateAsync({
                jobId: id,
                title: editedTitle,
                description: editedDescription,
                editor_email: editorEmail || undefined
            });

            setAction('EDITED');
            setIsSubmitted(true);
            toast.success("Edits submitted successfully! HR will review your changes.");
        } catch (error: any) {
            toast.error(`Failed to submit edits: ${error.message || "Unknown error"}`);
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
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${action === 'APPROVED' ? 'bg-green-100 text-green-600' :
                        action === 'EDITED' ? 'bg-blue-100 text-blue-600' :
                            'bg-orange-100 text-orange-600'
                        }`}>
                        {action === 'APPROVED' ? <CheckCircle2 className="w-10 h-10" /> :
                            action === 'EDITED' ? <Save className="w-10 h-10" /> :
                                <MessageSquare className="w-10 h-10" />}
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-3">
                        {action === 'APPROVED' ? 'Job Approved!' :
                            action === 'EDITED' ? 'Edits Submitted!' :
                                'Feedback Sent'}
                    </h2>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        {action === 'APPROVED'
                            ? 'Thank you for your review. The recruitment team has been notified and can now proceed with publishing the post.'
                            : action === 'EDITED'
                                ? 'Your proposed changes have been submitted to the HR team. They will review and either accept or decline your edits.'
                                : 'Your feedback has been sent to the recruitment team. They will update the job post and notify you when it\'s ready for another review.'}
                    </p>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-500 italic">
                        {action === 'EDITED' ? "Your edits are pending HR approval" : "\"This review was submitted by the Operation Manager\""}
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
                                        {isEditing ? (
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Job Title</label>
                                                <Input
                                                    value={editedTitle}
                                                    onChange={(e) => setEditedTitle(e.target.value)}
                                                    className="text-2xl font-bold h-auto py-2 focus:ring-indigo-500 border-indigo-200"
                                                />
                                            </div>
                                        ) : (
                                            <>
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
                                            </>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <Badge className="w-fit h-fit px-4 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-100 border-none capitalize text-sm font-medium">
                                            {job.status.toLowerCase().replace('_', ' ')}
                                        </Badge>
                                        {isEditing && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setIsEditing(false)}
                                                className="text-slate-400 hover:text-red-500 h-8 gap-1"
                                            >
                                                <X className="w-3.5 h-3.5" /> Cancel Edit
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 bg-white">
                                <div className="space-y-8">
                                    <section>
                                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                                            <FileText className="w-5 h-5 mr-2 text-indigo-500" />
                                            Job Description
                                        </h3>
                                        {isEditing ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                                                        <FileText className="w-5 h-5 mr-2 text-indigo-500" />
                                                        Job Description
                                                    </h3>
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 font-normal">
                                                        Tip: Use "•" for bullet points
                                                    </Badge>
                                                </div>
                                                <Textarea
                                                    value={editedDescription}
                                                    onChange={(e) => setEditedDescription(e.target.value)}
                                                    onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                                                        if (e.key === 'Enter') {
                                                            const target = e.currentTarget;
                                                            const start = target.selectionStart;
                                                            const lines = editedDescription.substring(0, start).split('\n');
                                                            const lastLine = lines[lines.length - 1];

                                                            // If last line starts with a bullet
                                                            if (lastLine.trim().startsWith('•')) {
                                                                // If it's JUST a bullet, delete it (close list)
                                                                if (lastLine.trim() === '•') {
                                                                    e.preventDefault();
                                                                    const before = editedDescription.substring(0, start - 1);
                                                                    const after = editedDescription.substring(target.selectionEnd);
                                                                    setEditedDescription(before + '\n' + after);
                                                                    return;
                                                                }

                                                                // Otherwise, auto-insert new bullet
                                                                e.preventDefault();
                                                                const before = editedDescription.substring(0, start);
                                                                const after = editedDescription.substring(target.selectionEnd);
                                                                const bulletWithSpace = '\n• ';
                                                                setEditedDescription(before + bulletWithSpace + after);

                                                                // Move cursor after the new bullet
                                                                setTimeout(() => {
                                                                    target.selectionStart = target.selectionEnd = start + bulletWithSpace.length;
                                                                }, 0);
                                                            }
                                                        }
                                                    }}
                                                    placeholder="Use • for your bullet points to keep formatting consistent..."
                                                    className="min-h-[400px] text-slate-600 leading-relaxed whitespace-pre-wrap bg-white p-6 rounded-xl border-indigo-200 focus:ring-indigo-500"
                                                />
                                            </div>
                                        ) : (
                                            <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-6 rounded-xl border border-slate-100">
                                                {job.description}
                                            </div>
                                        )}
                                    </section>

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
                                <div className="space-y-4">
                                    {isEditing ? (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                    <Send className="w-4 h-4 text-indigo-500" />
                                                    Your Email (Optional)
                                                </label>
                                                <Input
                                                    placeholder="Enter your email for reference..."
                                                    className="focus:ring-indigo-500 border-slate-200 rounded-xl"
                                                    value={editorEmail}
                                                    onChange={(e) => setEditorEmail(e.target.value)}
                                                />
                                            </div>
                                            <Button
                                                size="lg"
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-14 rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
                                                onClick={handleSubmitEdit}
                                                disabled={submitEditMutation.isPending}
                                            >
                                                {submitEditMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                                                Submit Edits to HR
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
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

                                            <div className="flex flex-col gap-4 pt-4">
                                                <div className="flex flex-col sm:flex-row gap-4">
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
                                                <div className="relative">
                                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
                                                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">Or directly improve it</span></div>
                                                </div>
                                                <Button
                                                    size="lg"
                                                    variant="secondary"
                                                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold h-14 rounded-xl transition-all active:scale-[0.98]"
                                                    onClick={handleStartEdit}
                                                >
                                                    <Edit3 className="w-5 h-5 mr-2 text-indigo-500" />
                                                    Edit Post Content
                                                </Button>
                                            </div>
                                        </>
                                    )}
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
