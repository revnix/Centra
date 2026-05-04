"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { onboardingApi, OnboardingResponse } from "@/lib/api/onboarding";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock, CalendarDays, Rocket, ArrowRight, ShieldCheck, Sparkles, Building2, User, FileText, Shield, GraduationCap, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

// New Components
import { OnboardingSidebar, ONBOARDING_STEPS } from "@/components/onboarding/OnboardingSidebar";
import { PersonalInfoForm } from "@/components/onboarding/PersonalInfoForm";
import { InductionTracker } from "@/components/onboarding/InductionTracker";

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
    const [activeStep, setActiveStep] = useState(1);
    
    // Form States
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
            
            // Determine active step based on status if not already set
            if (data.status === "PENDING_CANDIDATE_JOINING" || data.status === "PENDING_HR_DETAILS") {
                setActiveStep(1);
            } else if (data.status === "PENDING_CANDIDATE_DOCS" || data.status === "PENDING_HR_DOCS") {
                setActiveStep(2);
            } else if (data.status === "PENDING_IT_SETUP" || data.status === "PENDING_INDUCTION" || data.status === "COMPLETED") {
                setActiveStep(3);
            }
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Failed to load onboarding info");
        } finally {
            setLoading(false);
        }
    };

    const progressPercentage = useMemo(() => {
        if (!onboarding) return 0;
        switch (onboarding.status) {
            case "PENDING_CANDIDATE_JOINING": return 20;
            case "PENDING_HR_DETAILS": return 40;
            case "PENDING_CANDIDATE_DOCS": return 60;
            case "PENDING_HR_DOCS": return 80;
            case "PENDING_IT_SETUP": return 85;
            case "PENDING_INDUCTION": return 95;
            case "COMPLETED": return 100;
            default: return 0;
        }
    }, [onboarding]);

    const completedSteps = useMemo(() => {
        const steps = [];
        if (!onboarding) return [];
        if (onboarding.joining_date && onboarding.cnic_number) steps.push(1);
        if (onboarding.doc_front_picture_url && onboarding.doc_id_card_url) steps.push(2);
        if (onboarding.status === "COMPLETED") {
            steps.push(3);
        }
        return steps;
    }, [onboarding]);

    const isLocked = useMemo(() => onboarding?.status === "COMPLETED", [onboarding]);

    const handleSavePersonalInfo = async (formData: any) => {
        if (isLocked) return;
        try {
            setIsSaving(true);
            await onboardingApi.updateCandidateInfo(applicationId, {
                ...formData,
                joining_date: onboarding?.joining_date || new Date().toISOString()
            }, token);
            toast.success("Personal information updated");
            await fetchOnboarding();
            setActiveStep(2);
        } catch (err: any) {
            toast.error(err?.message || "Failed to save information");
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileSelect = (type: string, file: File | null) => {
        setDocFiles(prev => ({ ...prev, [type]: file }));
    };

    const handleSubmitDocuments = async () => {
        if (isLocked) return;
        const hasFiles = Object.values(docFiles).some(f => f !== null);
        if (!hasFiles) {
            toast.error("Please select at least one document to upload.");
            return;
        }
        try {
            setIsSubmittingDocs(true);
            const result = await onboardingApi.uploadDocuments(applicationId, docFiles, token);
            
            // Immediately mark as completed after document upload as per user request
            const finalResult = await onboardingApi.complete(applicationId, token);
            
            setOnboarding(finalResult);
            setDocFiles({ front_picture: null, cnic: null, resume: null, degree: null, police_clearance: null, experience_letter: null, salary_slip: null });
            toast.success("Onboarding completed successfully!");
        } catch (err: any) {
            toast.error(err?.message || "Failed to complete onboarding");
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
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
            {/* Top Branding Section */}
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-black text-[#0f172a]">Welcome to <span className="text-blue-600">Evalyn AI</span></h1>
                <p className="text-slate-500 font-medium">Onboarding for <span className="text-slate-900 font-bold">{onboarding?.job_title || "AI Developer"}</span> role</p>
            </div>

            {/* Progress Bar Section */}
            <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-bold text-slate-600">Onboarding Progress</span>
                    <span className="text-sm font-bold text-blue-600">{progressPercentage}%</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <motion.div 
                        className="h-full bg-blue-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercentage}%` }}
                        transition={{ duration: 1, ease: "circOut" }}
                    />
                </div>
            </div>

            {/* Main Layout Grid */}
            <div className="grid lg:grid-cols-12 gap-8 items-start">
                {/* Left Sidebar */}
                <div className="lg:col-span-3 h-full">
                    <OnboardingSidebar 
                        currentStep={activeStep} 
                        onStepClick={setActiveStep}
                        completedSteps={completedSteps}
                    />
                </div>

                {/* Right Content Area */}
                <div className="lg:col-span-9">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card className="border-none shadow-xl rounded-3xl overflow-hidden min-h-[500px]">
                                <CardHeader className="p-8 pb-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-2xl font-bold text-slate-900">
                                                {ONBOARDING_STEPS[activeStep - 1]?.title || "Onboarding"}
                                            </CardTitle>
                                            <CardDescription className="text-base mt-1">
                                                {activeStep === 1 && "Please provide your details for HR records and payroll."}
                                                {activeStep === 2 && "Upload scanned copies of your official documents."}
                                                {activeStep === 3 && "Final review by your manager and completion of the process."}
                                            </CardDescription>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-2xl">
                                            {ONBOARDING_STEPS[activeStep - 1] && React.createElement(ONBOARDING_STEPS[activeStep - 1].icon, { className: "w-8 h-8 text-blue-600" })}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 pt-6">
                                    {activeStep === 1 && (
                                        <PersonalInfoForm 
                                            onboarding={onboarding!} 
                                            onSave={handleSavePersonalInfo}
                                            isSaving={isSaving}
                                            isLocked={isLocked}
                                        />
                                    )}

                                    {activeStep === 2 && (
                                        <div className="space-y-6">
                                            <div className="grid gap-4">
                                                {[
                                                    { type: "front_picture", label: "Profile Picture *", description: "Recent professional photo", uploaded: onboarding?.doc_front_picture_url },
                                                    { type: "cnic", label: "CNIC / National ID *", description: "Front & Back (Merged PDF or Image)", uploaded: onboarding?.doc_id_card_url },
                                                    { type: "resume", label: "Latest Resume *", description: "Updated professional CV", uploaded: onboarding?.doc_resume_url },
                                                    { type: "degree", label: "Latest Degree / Certificate", description: "Educational qualification proof", uploaded: onboarding?.doc_educational_documents_url },
                                                    { type: "experience_letter", label: "Experience Letter *", description: "Previous company certificate", uploaded: onboarding?.doc_experience_letter_url },
                                                ].map(({ type, label, description, uploaded }) => (
                                                    <div key={type} className="flex items-center justify-between p-5 border-2 border-dashed border-slate-100 rounded-2xl bg-white hover:border-blue-100 transition-all group">
                                                        <div className="space-y-1">
                                                            <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                                                {label}
                                                                {uploaded && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                                            </h4>
                                                            <p className="text-xs text-slate-500">{description}</p>
                                                            {docFiles[type] && (
                                                                <p className="text-xs text-blue-600 font-bold truncate max-w-[200px]">{docFiles[type]!.name}</p>
                                                            )}
                                                        </div>
                                                        <label className={cn(isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                disabled={isLocked}
                                                                onChange={(e) => handleFileSelect(type, e.target.files?.[0] || null)}
                                                            />
                                                            <div className={cn(
                                                                "px-6 py-2 rounded-lg font-bold text-sm transition-all shadow-sm",
                                                                docFiles[type] ? "bg-blue-50 text-blue-600 border border-blue-200" : 
                                                                isLocked ? "bg-slate-100 text-slate-400 border border-slate-200" :
                                                                "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                                                            )}>
                                                                {isLocked ? "Locked" : (docFiles[type] ? "Change" : "Upload")}
                                                            </div>
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex justify-end pt-6 border-t mt-8">
                                                <Button
                                                    size="lg"
                                                    onClick={handleSubmitDocuments}
                                                    disabled={isSubmittingDocs || isLocked || !Object.values(docFiles).some(Boolean)}
                                                    className="px-10 h-12 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20 rounded-xl font-bold"
                                                >
                                                    {isSubmittingDocs ? "Completing..." : "Save & Finish"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {activeStep === 3 && (
                                        <div className="py-12 text-center space-y-8">
                                            <div className="mx-auto w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white shadow-2xl shadow-green-500/20">
                                                <CheckCircle2 className="w-12 h-12" />
                                            </div>
                                            <div className="space-y-4">
                                                <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                                                    {onboarding?.status === "COMPLETED" ? "You're All Set!" : "Verification in Progress"}
                                                </h2>
                                                <p className="text-xl text-slate-600 font-medium max-w-lg mx-auto">
                                                    {onboarding?.status === "COMPLETED" 
                                                        ? "Everything is ready for your first day. We're incredibly excited to have you join the team."
                                                        : "HR and IT are currently reviewing your documents and setting up your workspace."}
                                                </p>
                                            </div>
                                            
                                            {onboarding?.status !== "COMPLETED" && (
                                                <div className="mt-8 p-6 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-center gap-4 max-w-lg mx-auto">
                                                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                                                        <FileText className="w-6 h-6" />
                                                    </div>
                                                    <div className="text-left">
                                                        <h4 className="font-bold text-slate-900">Documents Submitted</h4>
                                                        <p className="text-sm text-slate-500">Your documents are safe with us and currently under review by the HR team.</p>
                                                    </div>
                                                </div>
                                            )}

                                            {onboarding?.status === "COMPLETED" && (
                                                <p className="text-sm text-slate-400 italic">Thank you for completing your onboarding!</p>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

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
