"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { onboardingApi, OnboardingResponse } from "@/lib/api/onboarding";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Clock, CalendarDays, Rocket, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// New Components
import { JourneyStepper } from "@/components/onboarding/JourneyStepper";
import { DocumentUploader } from "@/components/onboarding/DocumentUploader";
import { InductionTracker } from "@/components/onboarding/InductionTracker";

const STEPS = [
    { id: 1, name: "Joining Data", description: "Set your start date" },
    { id: 2, name: "Documents", description: "Upload required documents" },
];

import { Suspense } from "react";

function OnboardingContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const applicationId = Number(params.applicationId);
    
    const [onboarding, setOnboarding] = useState<OnboardingResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    
    // Form States
    const [joiningDate, setJoiningDate] = useState("");
    const [isSubmittingDocs, setIsSubmittingDocs] = useState(false);
    const [docFiles, setDocFiles] = useState<Record<string, File | null>>({
        front_picture: null,
        cnic: null,
        resume: null,
        degree: null,
        police_clearance: null,
        experience_letter: null,
        salary_slip: null,
    });
    
    useEffect(() => {
        if (applicationId) {
            fetchOnboarding();
        }
    }, [applicationId]);

    const fetchOnboarding = async () => {
        try {
            setLoading(true);
            const data = await onboardingApi.get(applicationId, token);
            setOnboarding(data);
            if (data.joining_date) setJoiningDate(data.joining_date.split('T')[0]);
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Failed to load onboarding info");
        } finally {
            setLoading(false);
        }
    };

    const currentStepIndex = useMemo(() => {
        if (!onboarding) return 0;
        if (onboarding.status === "PENDING_CANDIDATE_JOINING") return 0;
        if (onboarding.status === "PENDING_HR_DETAILS") return 0;
        if (onboarding.status === "PENDING_CANDIDATE_DOCS") return 1;
        return 1; // All other states show docs tab
    }, [onboarding]);

    const handleSaveJoiningDate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            await onboardingApi.updateCandidateInfo(applicationId, {
                joining_date: joiningDate ? new Date(joiningDate).toISOString() : new Date().toISOString()
            }, token);
            toast.success("Joining date updated");
            await fetchOnboarding();
        } catch (err: any) {
            toast.error(err?.message || "Failed to save joining date");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateDoc = (updatedOnboarding: OnboardingResponse) => {
        setOnboarding(updatedOnboarding);
    };

    const handleFileSelect = (type: string, file: File | null) => {
        setDocFiles(prev => ({ ...prev, [type]: file }));
    };

    const handleSubmitDocuments = async () => {
        const hasFiles = Object.values(docFiles).some(f => f !== null);
        if (!hasFiles) {
            toast.error("Please select at least one document to upload.");
            return;
        }
        try {
            setIsSubmittingDocs(true);
            const result = await onboardingApi.uploadDocuments(applicationId, docFiles, token);
            setOnboarding(result);
            setDocFiles({ front_picture: null, cnic: null, resume: null, degree: null, police_clearance: null, experience_letter: null, salary_slip: null });
            toast.success("Documents submitted successfully!");
        } catch (err: any) {
            toast.error(err?.message || "Failed to submit documents");
        } finally {
            setIsSubmittingDocs(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="relative">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                <Rocket className="w-5 h-5 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-slate-500 font-medium animate-pulse">Preparing your journey...</p>
        </div>
    );

    if (error && !onboarding) {
        return (
            <div className="p-8 max-w-2xl mx-auto">
                <Card className="border-red-200 shadow-2xl">
                    <CardHeader className="bg-red-50 text-red-900 border-b border-red-100">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                            <AlertCircle className="w-6 h-6"/> Access Required
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-10 text-center">
                        <p className="text-slate-600 mb-8">{error}</p>
                        <Button 
                            className="bg-slate-900 hover:bg-slate-800 px-8 h-12 rounded-full transition-all hover:scale-105 active:scale-95" 
                            onClick={() => router.push('/portal/status')}
                        >
                            Return to Portal
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-10">
            {/* Header Section */}
            <header className="relative overflow-hidden bg-slate-900 text-white p-8 md:p-12 rounded-[2rem] shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[100px] -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/20 blur-[100px] -ml-32 -mb-32" />
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-300 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                            <Sparkles className="w-3 h-3" />
                            Welcome Aboard
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Onboarding <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Hub</span></h1>
                        <p className="text-slate-400 max-w-xl text-lg font-medium leading-relaxed">
                            Congratulations on joining the team! Everything you need to get started is right here.
                        </p>
                    </div>
                </div>

                <div className="mt-12">
                    <JourneyStepper steps={STEPS} currentStep={currentStepIndex} />
                </div>
            </header>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStepIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-10"
                >
                    {/* Primary Content Grid */}
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Status Panel - Floating side info */}
                        <div className="lg:col-span-1 space-y-6">
                            <Card className="border-none shadow-xl bg-slate-50/50 backdrop-blur-md sticky top-8">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-blue-600" />
                                        Overall Progress
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                                            <span>Current Phase</span>
                                            <span className="text-blue-600">{STEPS[Math.min(currentStepIndex, 3)].name}</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                            <motion.div 
                                                className="h-full bg-blue-600"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(currentStepIndex / 4) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-6 border-t border-slate-200">
                                        <div className="flex items-center gap-3 text-sm text-slate-600">
                                            <Building2Icon />
                                            <span>{onboarding?.office_location || "Location Pending"}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-600">
                                            <ClockIcon />
                                            <span>{onboarding?.reporting_time || "Time Pending"}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Main Interaction Area */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Step 1 & 2: Forms */}
                            {currentStepIndex <= 1 && (
                                <div className="space-y-8">
                                    {/* Joining Info Card */}
                                    <Card className="border-none shadow-2xl overflow-hidden group">
                                        <div className="h-1.5 w-full bg-blue-600" />
                                        <CardHeader className="p-8 pb-4">
                                            <CardTitle className="text-2xl font-bold flex items-center gap-3">
                                                <CalendarDays className="w-6 h-6 text-blue-600" />
                                                Confirm Joining Date
                                            </CardTitle>
                                            <CardDescription className="text-base">
                                                Select your first day so we can prepare your workstation and welcome kit.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-8 pt-4">
                                            <form onSubmit={handleSaveJoiningDate} className="flex flex-col sm:flex-row gap-4">
                                                <div className="flex-1">
                                                    <Input 
                                                        type="date" 
                                                        value={joiningDate} 
                                                        onChange={e => setJoiningDate(e.target.value)} 
                                                        required 
                                                        className="h-12 text-lg font-medium border-slate-200 shadow-inner"
                                                    />
                                                </div>
                                                <Button size="lg" disabled={isSaving} className="h-12 px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 group-hover:scale-[1.02] transition-all">
                                                    Update Date
                                                    <ArrowRight className="ml-2 w-4 h-4" />
                                                </Button>
                                            </form>
                                        </CardContent>
                                    </Card>

                                    {/* Documents Card */}
                                    <Card className="border-none shadow-2xl overflow-hidden">
                                        <div className="h-1.5 w-full bg-purple-600" />
                                        <CardHeader className="p-8 pb-4">
                                            <CardTitle className="text-2xl font-bold flex items-center gap-3">
                                                <ShieldCheck className="w-6 h-6 text-purple-600" />
                                                Required Documents
                                            </CardTitle>
                                            <CardDescription className="text-base">
                                                Select your files below, then click <strong>Submit Documents</strong> to upload them all at once.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-8 pt-4 space-y-6">
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                {[
                                                    { type: "front_picture", label: "Professional Photo", description: "For your digital ID card", uploaded: onboarding?.doc_front_picture_url },
                                                    { type: "cnic", label: "Government ID (CNIC)", description: "Scan of CNIC or passport", uploaded: onboarding?.doc_id_card_url },
                                                    { type: "resume", label: "Updated Resume", description: "Latest professional CV", uploaded: onboarding?.doc_resume_url },
                                                    { type: "degree", label: "Educational Documents", description: "Degree, transcript & certificates", uploaded: onboarding?.doc_educational_documents_url },
                                                    { type: "police_clearance", label: "Police Clearance", description: "Police clearance certificate", uploaded: onboarding?.doc_police_clearance_url },
                                                    { type: "experience_letter", label: "Experience Letter", description: "From previous employer", uploaded: onboarding?.doc_experience_letter_url },
                                                    { type: "salary_slip", label: "Last Salary Slip", description: "Last 3 months required", uploaded: onboarding?.doc_salary_slip_url },
                                                ].map(({ type, label, description, uploaded }) => (
                                                    <div key={type} className="p-4 border rounded-xl bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                                                    {(uploaded || docFiles[type]) ? (
                                                                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                                                    ) : (
                                                                        <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                                                                    )}
                                                                    {label}
                                                                </h4>
                                                                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                                                                {docFiles[type] && (
                                                                    <p className="text-xs text-blue-600 mt-1 font-medium truncate">{docFiles[type]!.name}</p>
                                                                )}
                                                                {uploaded && !docFiles[type] && (
                                                                    <p className="text-xs text-green-600 mt-1 font-medium">Already uploaded</p>
                                                                )}
                                                            </div>
                                                            <label className="cursor-pointer shrink-0">
                                                                <input
                                                                    type="file"
                                                                    className="hidden"
                                                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                                    onChange={(e) => handleFileSelect(type, e.target.files?.[0] || null)}
                                                                />
                                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                                                                    {docFiles[type] ? "Change" : "Select"}
                                                                </span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Submit Button */}
                                            <div className="pt-4 border-t flex items-center justify-between gap-4">
                                                <p className="text-sm text-slate-500">
                                                    {Object.values(docFiles).filter(Boolean).length} file(s) selected
                                                </p>
                                                <Button
                                                    size="lg"
                                                    onClick={handleSubmitDocuments}
                                                    disabled={isSubmittingDocs || !Object.values(docFiles).some(Boolean)}
                                                    className="px-8 h-12 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/20 transition-all"
                                                >
                                                    {isSubmittingDocs ? (
                                                        <><Clock className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                                                    ) : (
                                                        <><CheckCircle2 className="w-4 h-4 mr-2" /> Submit Documents</>
                                                    )}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* Phase 3 & 4: Waiting & Induction */}
                            {currentStepIndex >= 2 && currentStepIndex <= 3 && (
                                <div className="space-y-8">
                                    <div className="bg-blue-50 border border-blue-100 p-8 rounded-3xl flex items-start gap-4">
                                        <div className="p-3 bg-blue-600 rounded-2xl text-white">
                                            <Sparkles className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-bold text-slate-900">Verification in Progress</h3>
                                            <p className="text-slate-600 leading-relaxed">
                                                HR and IT are currently reviewing your documents and setting up your workspace. 
                                                Check the trackers below for real-time updates.
                                            </p>
                                        </div>
                                    </div>
                                    <InductionTracker onboarding={onboarding!} />
                                </div>
                            )}

                            {/* Phase 5: Completed */}
                            {currentStepIndex >= 4 && (
                                <Card className="border-none shadow-2xl p-12 text-center space-y-6 bg-gradient-to-tr from-green-50 to-emerald-50">
                                    <div className="mx-auto w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/20 animate-bounce">
                                        <CheckCircle2 className="w-12 h-12" />
                                    </div>
                                    <div className="space-y-4">
                                        <h2 className="text-4xl font-black text-slate-900 tracking-tight">You're All Set!</h2>
                                        <p className="text-xl text-slate-600 font-medium max-w-lg mx-auto">
                                            Everything is ready for your first day. We're incredibly excited to have you join the team.
                                        </p>
                                    </div>
                                    <Button size="lg" className="rounded-full px-12 h-14 bg-slate-900 hover:bg-slate-800 text-lg font-bold">
                                        Go to Success Portal
                                        <ArrowRight className="ml-2 w-5 h-5" />
                                    </Button>
                                </Card>
                            )}
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

// Icons
function Building2Icon() { return <Building2 className="w-4 h-4 text-blue-600" />; }
function ClockIcon() { return <Clock className="w-4 h-4 text-blue-600" />; }
function Building2({ className }: { className?: string }) { return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>; }

export default function CandidateOnboardingPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-slate-500 font-medium animate-pulse">Loading...</p>
            </div>
        }>
            <OnboardingContent />
        </Suspense>
    );
}
