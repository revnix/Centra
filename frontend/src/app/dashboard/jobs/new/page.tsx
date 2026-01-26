"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Wand2,
    Share2,
    ThumbsUp,
    ThumbsDown,
    RefreshCw,
    MessageSquare,
    Linkedin,
    Twitter,
    Facebook,
    Instagram,
    Rocket,
    AlertCircle,
    MapPin,
    Briefcase,
    TrendingUp,
    Zap
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useJobGeneration } from "@/lib/hooks/useJobGeneration";

// --- Schemas ---

const jobBasicSchema = z.object({
    title: z.string().min(2, "Job title is required"),
    department: z.string().min(2, "Department is required"),
    location: z.string().min(2, "Location is required"),
    type: z.string().min(1, "Job type is required"),
    description: z.string().min(50, "Description must be at least 50 characters"),
});

const aiConfigSchema = z.object({
    requiredSkills: z.string().min(2, "Add at least one skill"),
    experienceLevel: z.string().min(1, "Experience level is required"),
});

type Step1Data = z.infer<typeof jobBasicSchema>;
type Step2Data = z.infer<typeof aiConfigSchema>;

// Mock connected accounts (same as integrations page)
const connectedAccounts = [
    {
        id: '1',
        platform: 'linkedin' as const,
        name: 'TechCorp Inc.',
        handle: 'techcorp-inc',
        icon: Linkedin,
        color: 'bg-blue-600',
    },
    {
        id: '2',
        platform: 'twitter' as const,
        name: 'TechCorp Careers',
        handle: '@TechCorpJobs',
        icon: Twitter,
        color: 'bg-sky-500',
    },
    {
        id: '3',
        platform: 'facebook' as const,
        name: 'TechCorp',
        handle: 'facebook.com/techcorp',
        icon: Facebook,
        color: 'bg-blue-700',
    },
];

export default function CreateJobPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // LangGraph Job Generation Hook
    const jobGeneration = useJobGeneration();

    // Data State
    const [formData, setFormData] = useState<Partial<Step1Data & Step2Data>>({});

    // AI Review State
    const [socialPost, setSocialPost] = useState("");
    const [feedback, setFeedback] = useState("");
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [version, setVersion] = useState(1);
    const [showFeedbackInput, setShowFeedbackInput] = useState(false);

    // Publishing Dialog State
    const [showPublishDialog, setShowPublishDialog] = useState(false);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>(
        connectedAccounts.map(a => a.id) // Default all selected
    );

    const company_name = connectedAccounts.find(a => a.id === selectedAccounts[0])?.name || connectedAccounts[0]?.name || "TechCorp Inc.";

    // Forms
    const form1 = useForm<Step1Data>({
        resolver: zodResolver(jobBasicSchema),
        defaultValues: {
            title: "",
            department: "",
            location: "",
            type: "full-time",
            description: "",
        },
    });

    const form2 = useForm<Step2Data>({
        resolver: zodResolver(aiConfigSchema),
        defaultValues: {
            requiredSkills: "",
            experienceLevel: "mid",
        },
    });

    // Handlers
    const onStep1Submit = (data: Step1Data) => {
        setFormData((prev) => ({ ...prev, ...data }));
        setStep(2);
    };

    const onStep2Submit = (data: Step2Data) => {
        setFormData((prev) => ({ ...prev, ...data }));

        // Map employment type
        const employmentTypeMap: Record<string, 'Full-time' | 'Part-time' | 'Contract' | 'Internship'> = {
            'full-time': 'Full-time',
            'part-time': 'Part-time',
            'contract': 'Contract',
            'internship': 'Internship',
        };

        // Map experience level
        const experienceLevelMap: Record<string, 'Junior' | 'Mid' | 'Senior' | 'Lead'> = {
            'junior': 'Junior',
            'mid': 'Mid',
            'senior': 'Senior',
            'lead': 'Lead',
        };

        // Start LangGraph job generation
        jobGeneration.generateJob({
            role: formData.title || 'Software Engineer',
            location: formData.location || 'Remote',
            skills: data.requiredSkills.split(',').map(s => s.trim()),
            company_name: formData.department || 'TechCorp',
            employment_type: employmentTypeMap[formData.type || 'full-time'] || 'Full-time',
            experience_level: experienceLevelMap[data.experienceLevel] || 'Mid',
        });

        // Generate social post placeholder
        generateInitialSocialPost(formData.title || "Job");
        setStep(3);
    };

    // --- AI Logic ---

    const generateDescription = () => {
        const title = form1.getValues("title");
        if (!title) return;

        form1.setValue("description", `Loading AI suggestion...`);
        setTimeout(() => {
            form1.setValue("description", `We are looking for a talented ${title} to join our dynamic team. 

Key Responsibilities:
- Design and implement scalable solutions
- Collaborate with cross-functional teams
- Ensure high performance and responsiveness

Requirements:
- 3+ years of experience in relevant technologies
- Strong problem-solving skills
- Excellent communication abilities`);
        }, 1000);
    };

    const generateInitialSocialPost = (title: string) => {
        setSocialPost(`🚀 We are hiring!

Are you a passionate ${title}? ${formData.department} needs you.

📍 ${formData.location}
💼 ${formData.type}

Apply now and shape the future with us! #Hiring #${title.replace(/\s/g, '')} #TechJobs`);
    };

    const handleRefineWithFeedback = async () => {
        if (!feedback) return;
        setIsRegenerating(true);

        await new Promise(resolve => setTimeout(resolve, 2000));

        const newSocial = socialPost.replace("We are hiring!", "🌟 Exciting Opportunity Alert! 🌟") + `\n\n(Updated: ${feedback})`;
        setSocialPost(newSocial);

        setVersion(v => v + 1);
        setFeedback("");
        setShowFeedbackInput(false);
        setIsRegenerating(false);
    };

    const handleAccountToggle = (accountId: string) => {
        setSelectedAccounts(prev =>
            prev.includes(accountId)
                ? prev.filter(id => id !== accountId)
                : [...prev, accountId]
        );
    };

    const handleFinalPublish = async () => {
        setIsLoading(true);
        // Simulate API call to publish job + social media to selected accounts
        console.log("Publishing to accounts:", selectedAccounts);
        console.log("Job data:", formData);
        console.log("Social post:", socialPost);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsLoading(false);
        setShowPublishDialog(false);
        router.push("/dashboard/jobs");
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/jobs">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Create New Job</h1>
                    <p className="text-slate-500">Step {step} of 3</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-blue-600 transition-all duration-500 ease-in-out"
                    style={{ width: `${(step / 3) * 100}%` }}
                />
            </div>

            {/* STEP 1: Details */}
            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Job Details</CardTitle>
                        <CardDescription>Define the role and auto-generate the description.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form1}>
                            <form onSubmit={form1.handleSubmit(onStep1Submit)} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form1.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Job Title</FormLabel>
                                                <FormControl><Input placeholder="e.g. Senior Product Designer" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form1.control}
                                        name="department"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Department</FormLabel>
                                                <FormControl><Input placeholder="e.g. Design" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form1.control}
                                        name="location"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Location</FormLabel>
                                                <FormControl><Input placeholder="e.g. Remote / New York" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form1.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="full-time">Full-time</SelectItem>
                                                        <SelectItem value="part-time">Part-time</SelectItem>
                                                        <SelectItem value="contract">Contract</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form1.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex justify-between items-center">
                                                Job Description
                                                <Button type="button" variant="outline" size="sm" onClick={generateDescription} className="text-blue-600">
                                                    <Wand2 className="h-3 w-3 mr-2" /> Auto-Generate
                                                </Button>
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea className="min-h-[200px] font-mono text-sm" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex justify-end">
                                    <Button type="submit">Next: AI Config <ChevronRight className="ml-2 h-4 w-4" /></Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            )}

            {/* STEP 2: AI Config */}
            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>AI Configuration</CardTitle>
                        <CardDescription>Tailor the AI recruiter for this specific role.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form2}>
                            <form onSubmit={form2.handleSubmit(onStep2Submit)} className="space-y-6">
                                <FormField
                                    control={form2.control}
                                    name="requiredSkills"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Required Skills</FormLabel>
                                            <FormControl><Input placeholder="React, Node.js, AWS..." {...field} /></FormControl>
                                            <FormDescription>AI will verify these skills during screening.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form2.control}
                                    name="experienceLevel"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Experience Level</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="junior">Junior</SelectItem>
                                                    <SelectItem value="mid">Mid-Level</SelectItem>
                                                    <SelectItem value="senior">Senior</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex justify-between pt-4">
                                    <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                                    <Button type="submit">Next: Review & Generate <ChevronRight className="ml-2 h-4 w-4" /></Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            )}

            {/* STEP 3: Review & Refine (The Feedback Loop) */}
            {step === 3 && (
                <div className="space-y-6">
                    {/* Loading State */}
                    {jobGeneration.isLoading && !jobGeneration.generatedPost ? (
                        <Card className="p-12">
                            <div className="flex flex-col items-center justify-center gap-4">
                                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-slate-900">Generating Job Description...</h3>
                                    <p className="text-slate-500">AI is crafting your job post. This may take a few seconds.</p>
                                </div>
                            </div>
                        </Card>
                    ) : null}

                    {/* Error State */}
                    {jobGeneration.error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>
                                {jobGeneration.error.message || 'Failed to generate job description. Please try again.'}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => setStep(2)}
                                >
                                    Go Back
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Generated Content */}
                    {(jobGeneration.generatedPost || jobGeneration.isAwaitingReview) && (
                        <>
                            <Alert className="bg-blue-50 border-blue-200">
                                <Wand2 className="h-4 w-4 text-blue-600" />
                                <AlertTitle className="text-blue-800">AI Content Generated (Version {version})</AlertTitle>
                                <AlertDescription className="text-blue-700">
                                    Please review the job post. You can approve it for publication or request AI refinement.
                                </AlertDescription>
                            </Alert>

                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {/* Left: Job Post from AI */}
                                <Card className="lg:col-span-3 flex flex-col h-full overflow-hidden border-blue-200 shadow-xl rounded-2xl transition-all hover:shadow-2xl">
                                    <CardHeader className="bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800 text-white border-b-0 py-8 relative">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <Wand2 className="h-32 w-32 -mr-8 -mt-8" />
                                        </div>
                                        <div className="flex justify-between items-start relative z-10">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className="bg-blue-400/20 text-blue-100 hover:bg-blue-400/30 border-blue-400/30 backdrop-blur-sm px-3 py-1 text-[10px] uppercase tracking-wider font-bold">
                                                        <Zap className="h-3 w-3 mr-1 fill-blue-400" /> AI Synthesized
                                                    </Badge>
                                                    <Badge className="bg-white/10 text-white hover:bg-white/20 border-white/20 backdrop-blur-sm px-3 py-1 text-[10px] uppercase tracking-wider font-bold">
                                                        v{version}
                                                    </Badge>
                                                </div>
                                                <CardTitle className="text-3xl font-extrabold tracking-tight">
                                                    {jobGeneration.generatedPost?.job_title || formData.title}
                                                </CardTitle>
                                                <div className="flex flex-wrap gap-4 pt-2 text-indigo-100 font-medium">
                                                    <div className="flex items-center gap-1.5 text-sm">
                                                        <MapPin className="h-4 w-4" />
                                                        {jobGeneration.generatedPost?.location || formData.location}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-sm">
                                                        <Briefcase className="h-4 w-4" />
                                                        {formData.type || 'Full-time'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-sm">
                                                        <TrendingUp className="h-4 w-4" />
                                                        {form2.getValues("experienceLevel") || 'Mid-Level'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1 overflow-y-auto p-0 bg-slate-50/30">
                                        <div className="p-8 space-y-8">
                                            {/* Summary */}
                                            {jobGeneration.generatedPost?.summary && (
                                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                                    <h4 className="text-[11px] uppercase font-bold text-indigo-500 tracking-[0.2em] mb-4">Executive Summary</h4>
                                                    <p className="text-slate-700 leading-relaxed font-medium text-base">
                                                        {jobGeneration.generatedPost.summary}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Skills */}
                                            {jobGeneration.generatedPost?.skills && jobGeneration.generatedPost.skills.length > 0 && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 bg-indigo-100 rounded-lg">
                                                            <Wand2 className="h-4 w-4 text-indigo-600" />
                                                        </div>
                                                        <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wider">Technical Stack</h4>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {jobGeneration.generatedPost.skills.map((skill: string, i: number) => (
                                                            <Badge key={i} variant="secondary" className="bg-white text-indigo-700 border-indigo-100 shadow-sm hover:bg-indigo-50 px-3 py-1 font-semibold text-xs">
                                                                {skill}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Grid layout for Lists */}
                                            <div className="grid grid-cols-1 gap-8">
                                                {/* Responsibilities */}
                                                {jobGeneration.generatedPost?.responsibilities && jobGeneration.generatedPost.responsibilities.length > 0 && (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                                <Check className="h-4 w-4 text-blue-600" />
                                                            </div>
                                                            <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wider">Core Responsibilities</h4>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-3">
                                                            {jobGeneration.generatedPost.responsibilities.map((item: string, i: number) => (
                                                                <div key={i} className="group bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4 transition-all hover:border-blue-200 hover:shadow-md">
                                                                    <div className="mt-1 h-6 w-6 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                                                                        <span className="text-[10px] font-bold text-blue-600">{i + 1}</span>
                                                                    </div>
                                                                    <span className="text-sm text-slate-700 leading-relaxed font-medium">{item}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Requirements & Preferred */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    {/* Requirements */}
                                                    {jobGeneration.generatedPost?.requirements && jobGeneration.generatedPost.requirements.length > 0 && (
                                                        <div className="space-y-4">
                                                            <h4 className="font-bold text-[11px] text-slate-400 uppercase tracking-[0.2em] px-1">Essential Qualifications</h4>
                                                            <div className="space-y-2">
                                                                {jobGeneration.generatedPost.requirements.map((item: string, i: number) => (
                                                                    <div key={i} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                                                                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)] flex-shrink-0" />
                                                                        <span className="text-xs text-slate-700 font-medium">{item}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Preferred */}
                                                    {jobGeneration.generatedPost?.preferred_qualifications && jobGeneration.generatedPost.preferred_qualifications.length > 0 && (
                                                        <div className="space-y-4">
                                                            <h4 className="font-bold text-[11px] text-slate-400 uppercase tracking-[0.2em] px-1">Bonus Points</h4>
                                                            <div className="space-y-2">
                                                                {jobGeneration.generatedPost.preferred_qualifications.map((item: string, i: number) => (
                                                                    <div key={i} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                                                                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)] flex-shrink-0" />
                                                                        <span className="text-xs text-slate-700 font-medium">{item}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Benefits */}
                                                {jobGeneration.generatedPost?.benefits && jobGeneration.generatedPost.benefits.length > 0 && (
                                                    <div className="space-y-4">
                                                        <h4 className="font-bold text-[11px] text-slate-400 uppercase tracking-[0.2em] px-1">Why Join Us?</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {jobGeneration.generatedPost.benefits.map((item: string, i: number) => (
                                                                <Badge key={i} variant="outline" className="text-emerald-700 border-emerald-100 bg-emerald-50/50 px-4 py-1.5 rounded-full font-bold text-[10px] tracking-tight hover:bg-emerald-100 transition-colors cursor-default">
                                                                    {item}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                    <div className="bg-slate-900 border-t border-slate-800 px-6 py-4 flex justify-between items-center text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                            <span>Candidate Screened with Evalyn AI</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-60">
                                            <Zap className="h-3 w-3 text-blue-500 fill-blue-500" />
                                            <span>Synthesized Intelligence</span>
                                        </div>
                                    </div>
                                </Card>

                                {/* Right: Social Media */}
                                {/* Right: Social Media */}
                                <Card className="lg:col-span-2 flex flex-col h-full border-slate-200 shadow-xl rounded-2xl overflow-hidden bg-white group">
                                    <CardHeader className="bg-slate-50/80 border-b py-6 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                                                <Share2 className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg font-bold text-slate-900">Social Media Draft</CardTitle>
                                                <CardDescription className="text-xs font-medium">LinkedIn / Twitter optimized preview</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1 p-6 space-y-6">
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                            {/* LinkedIn Header */}
                                            <div className="p-4 flex items-center gap-3">
                                                <div className="h-12 w-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center border border-slate-200">
                                                    <Briefcase className="h-6 w-6 text-slate-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-sm text-slate-900">{company_name || 'TechCorp Inc.'}</span>
                                                        <span className="text-[10px] text-slate-400">• 1st</span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 font-medium">Hiring modern talent today</div>
                                                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                        Just now • <MapPin className="h-2 w-2" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="px-4 pb-4 space-y-4">
                                                <div className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed">
                                                    {socialPost || "🚀 Join our team as a " + (jobGeneration.generatedPost?.job_title || formData.title) + "! We're looking for passionate individuals to help us build the future. #Hiring #TechJobs"}
                                                </div>

                                                {/* Job Card Placeholder in Post */}
                                                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                                                    <div className="h-40 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex flex-col items-center justify-center text-white p-6 text-center space-y-2">
                                                        <Zap className="h-10 w-10 text-blue-200 fill-blue-200/20" />
                                                        <div className="font-extrabold text-lg leading-tight">We are hiring a<br />{jobGeneration.generatedPost?.job_title || formData.title}!</div>
                                                        <Badge className="bg-white/20 text-white hover:bg-white/30 border-none text-[10px] uppercase font-bold">Apply Now</Badge>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="font-bold text-sm">{jobGeneration.generatedPost?.job_title || formData.title}</div>
                                                        <div className="text-xs text-slate-500">{jobGeneration.generatedPost?.location || formData.location} • {formData.type || 'Full-time'}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Interaction Bar */}
                                            <div className="px-4 py-3 border-t bg-slate-50/30 flex items-center justify-between">
                                                <div className="flex items-center gap-6">
                                                    <button className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors">
                                                        <ThumbsUp className="h-4 w-4" />
                                                        <span className="text-[11px] font-bold">Like</span>
                                                    </button>
                                                    <button className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors">
                                                        <MessageSquare className="h-4 w-4" />
                                                        <span className="text-[11px] font-bold">Comment</span>
                                                    </button>
                                                    <button className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors">
                                                        <Share2 className="h-4 w-4" />
                                                        <span className="text-[11px] font-bold">Share</span>
                                                    </button>
                                                </div>
                                                <button className="flex items-center gap-1 text-slate-400 hover:text-blue-600 transition-colors">
                                                    <RefreshCw className="h-3 w-3" />
                                                    <span className="text-[10px] font-bold">Sync AI</span>
                                                </button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Feedback Controls */}
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-300">
                                <Card className={`border-none shadow-2xl rounded-2xl overflow-hidden transition-all duration-500 ${showFeedbackInput ? 'ring-2 ring-amber-400 ring-offset-4' : ''}`}>
                                    <div className={`h-1.5 w-full ${showFeedbackInput ? 'bg-amber-500' : 'bg-blue-600'}`} />
                                    <CardContent className="p-8">
                                        {!showFeedbackInput ? (
                                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                                <div className="text-center md:text-left">
                                                    <h3 className="font-extrabold text-2xl text-slate-900 tracking-tight">Does this look perfect?</h3>
                                                    <p className="text-slate-500 font-medium text-base mt-1">Approve to launch immediately or collaborative with AI for refinements.</p>
                                                </div>
                                                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                                                    <Button
                                                        variant="outline"
                                                        size="lg"
                                                        className="border-slate-200 hover:bg-slate-50 hover:text-slate-900 px-8 py-6 rounded-xl font-bold transition-all hover:scale-105 active:scale-95"
                                                        onClick={() => setShowFeedbackInput(true)}
                                                        disabled={jobGeneration.isLoading}
                                                    >
                                                        <MessageSquare className="mr-2 h-5 w-5" />
                                                        Suggest Improvements
                                                    </Button>
                                                    <Button
                                                        size="lg"
                                                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 px-10 py-6 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 group"
                                                        onClick={async () => {
                                                            await jobGeneration.approveJob();
                                                            setShowPublishDialog(true);
                                                        }}
                                                        disabled={jobGeneration.isLoading}
                                                    >
                                                        <Rocket className="mr-2 h-5 w-5 group-hover:animate-bounce" />
                                                        Launch Job Post
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-amber-100 rounded-lg">
                                                        <Wand2 className="h-5 w-5 text-amber-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-extrabold text-xl text-slate-900 tracking-tight">Refine with Feedback</h3>
                                                        <p className="text-slate-500 text-sm font-medium">Tell the AI what to change and it will regenerate the post.</p>
                                                    </div>
                                                </div>
                                                <Textarea
                                                    placeholder="Example: 'Make the summary more punchy and add a requirement for React Native experience...'"
                                                    value={feedback}
                                                    onChange={(e) => setFeedback(e.target.value)}
                                                    className="bg-slate-50/50 min-h-[140px] border-slate-200 rounded-xl focus:ring-amber-500 focus:border-amber-500 text-base p-4 placeholder:text-slate-400"
                                                />
                                                <div className="flex justify-end gap-4">
                                                    <Button
                                                        variant="ghost"
                                                        className="rounded-xl font-bold text-slate-500 hover:bg-slate-100"
                                                        onClick={() => setShowFeedbackInput(false)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size="lg"
                                                        onClick={async () => {
                                                            setIsRegenerating(true);
                                                            await jobGeneration.rejectWithFeedback(feedback);
                                                            setVersion(v => v + 1);
                                                            setFeedback("");
                                                            setShowFeedbackInput(false);
                                                            setIsRegenerating(false);
                                                        }}
                                                        disabled={isRegenerating || !feedback || jobGeneration.isLoading}
                                                        className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-200 px-8 rounded-xl font-bold hover:scale-105 transition-all"
                                                    >
                                                        {isRegenerating || jobGeneration.isLoading ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                                Updating JD...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <RefreshCw className="mr-2 h-5 w-5" />
                                                                Regenerate Post
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    )}
                </div>
            )
            }

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
                            disabled={isLoading || selectedAccounts.length === 0}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isLoading ? (
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
