"use client";

import { useState } from "react";
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
    Rocket
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
                    <Alert className="bg-blue-50 border-blue-200">
                        <Wand2 className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-800">AI Content Generated (Version {version})</AlertTitle>
                        <AlertDescription className="text-blue-700">
                            Please review the job post and social media draft. You can approve them for publication or request AI refinement.
                        </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left: Job Post */}
                        <Card className="flex flex-col h-full">
                            <CardHeader>
                                <CardTitle>Job Post Preview</CardTitle>
                                <CardDescription>Visible on career page</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="prose prose-sm max-w-none">
                                    <h3 className="text-lg font-bold">{formData.title}</h3>
                                    <div className="flex gap-2 text-sm text-slate-500 mb-4">
                                        <span>{formData.department}</span> • <span>{formData.location}</span>
                                    </div>
                                    <div className="whitespace-pre-wrap text-sm bg-slate-50 p-4 rounded-md border">
                                        {formData.description || form1.getValues("description")}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Right: Social Media */}
                        <Card className="flex flex-col h-full border-blue-200 shadow-sm">
                            <CardHeader className="bg-blue-50/50">
                                <CardTitle className="flex items-center gap-2">
                                    <Share2 className="h-4 w-4 text-blue-600" />
                                    Social Media Draft
                                </CardTitle>
                                <CardDescription>LinkedIn / Twitter preview</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 pt-6">
                                <div className="bg-white p-4 rounded-lg border shadow-sm">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="h-10 w-10 bg-slate-100 rounded-full" />
                                        <div>
                                            <div className="font-semibold text-sm">TechCorp Inc.</div>
                                            <div className="text-xs text-slate-500">Just now • 🌍</div>
                                        </div>
                                    </div>
                                    <div className="whitespace-pre-wrap text-sm text-slate-800">
                                        {socialPost}
                                    </div>
                                    <div className="mt-4 h-32 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-sm border-2 border-dashed">
                                        [Job Image Placeholder]
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Feedback Controls */}
                    <Card className={`border-2 ${showFeedbackInput ? 'border-amber-200 bg-amber-50' : 'border-slate-100'}`}>
                        <CardContent className="p-6">
                            {!showFeedbackInput ? (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-lg">Does this look good?</h3>
                                        <p className="text-slate-500 text-sm">Approve to publish immediately or request changes.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            className="border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                                            onClick={() => setShowFeedbackInput(true)}
                                            disabled={isLoading}
                                        >
                                            <ThumbsDown className="mr-2 h-4 w-4" />
                                            Reject & Refine
                                        </Button>
                                        <Button
                                            className="bg-green-600 hover:bg-green-700 min-w-[140px]"
                                            onClick={() => setShowPublishDialog(true)}
                                            disabled={isLoading}
                                        >
                                            <ThumbsUp className="mr-2 h-4 w-4" />
                                            Approve & Publish
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-amber-800 font-medium">
                                        <MessageSquare className="h-4 w-4" />
                                        Provide Feedback for AI Iteration
                                    </div>
                                    <Textarea
                                        placeholder="e.g. Make the social post more energetic, mentioning our summer retreat. Also make the job description sound more authoritative."
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        className="bg-white min-h-[100px]"
                                    />
                                    <div className="flex justify-end gap-3">
                                        <Button variant="ghost" onClick={() => setShowFeedbackInput(false)}>Cancel</Button>
                                        <Button onClick={handleRefineWithFeedback} disabled={isRegenerating || !feedback} className="bg-amber-600 hover:bg-amber-700 text-white">
                                            {isRegenerating ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Regenerating...
                                                </>
                                            ) : (
                                                <>
                                                    <RefreshCw className="mr-2 h-4 w-4" />
                                                    Regenerate Content
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
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
