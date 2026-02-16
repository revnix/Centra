"use client";

import { use, useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/api";
import { useJob } from "@/lib/hooks/useJobs";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, CheckCircle2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const applicationSchema = z.object({
    full_name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone_number: z.string().min(10, "Phone number must be at least 10 digits"),
    resume_file: z.any().optional(),
    linkedin_url: z.string().optional().or(z.literal("")),
    cover_letter: z.string().optional().or(z.literal("")),
    skills: z.string().min(2, "Please enter at least one skill"),
    experience_years: z.coerce.number().min(0, "Experience is required"),
});

type ApplicationFormValues = {
    full_name: string;
    email: string;
    phone_number: string;
    resume_file?: any;
    linkedin_url?: string;
    cover_letter?: string;
    skills: string;
    experience_years: number;
};

export default function JobApplicationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: job, isLoading: isJobLoading } = useJob(id);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const sourceUrlRef = useRef<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && !sourceUrlRef.current) {
            const paramSource = searchParams.get('source_url');
            const referrer = document.referrer;

            if (paramSource) {
                sourceUrlRef.current = paramSource;
            } else if (referrer && !referrer.includes(window.location.host)) {
                sourceUrlRef.current = referrer;
            } else {
                sourceUrlRef.current = `${window.location.origin}/jobs/${id}`;
            }
        }
    }, [searchParams, id]);

    const form = useForm<ApplicationFormValues>({
        resolver: zodResolver(applicationSchema) as any,
        defaultValues: {
            full_name: "",
            email: "",
            phone_number: "",
            linkedin_url: "",
            cover_letter: "",
            skills: "",
            experience_years: 0,
        },
    });

    const onSubmit = async (data: ApplicationFormValues) => {
        if (!resumeFile) {
            toast.error("Please upload your resume");
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('job_id', id);
            formData.append('full_name', data.full_name);
            formData.append('email', data.email);
            formData.append('phone_number', data.phone_number);
            formData.append('cover_letter', data.cover_letter || "");

            if (data.linkedin_url) {
                let url = data.linkedin_url;
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = `https://${url}`;
                }
                formData.append('linkedin_url', url);
            }

            formData.append('resume_file', resumeFile);

            const skillsArray = data.skills
                .split(",")
                .map(s => s.trim())
                .filter(s => s !== "");
            formData.append('skills', JSON.stringify(skillsArray));

            formData.append('experience_years', String(data.experience_years));

            await api.applications.guestApply(formData);

            toast.success("Application submitted successfully!");
            setIsSuccess(true);
        } catch (error: any) {
            console.error("Application error:", error);
            let errorMessage = error.message || "Failed to submit application. Please try again.";

            if (error.details && Array.isArray(error.details)) {
                errorMessage = error.details.map((d: any) => {
                    const field = d.loc[d.loc.length - 1];
                    return `${field}: ${d.msg}`;
                }).join('; ');
            }

            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isJobLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!job) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
                <h2 className="mb-4 text-2xl font-bold text-slate-900">Job not found</h2>
                <Link href="/jobs">
                    <Button variant="outline">Back to Jobs</Button>
                </Link>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
                            <CheckCircle2 className="h-8 w-8 text-indigo-600" />
                        </div>
                        <CardTitle className="text-2xl">Application Received!</CardTitle>
                        <CardDescription>
                            Thanks for applying to <strong>{job.title}</strong> at {job.company_name}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Internal Review in Progress</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Our AI system is currently reviewing your resume, skills, and experience against the job requirements.
                            </p>
                            <p className="mt-4 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                If shortlisted, you will receive an interview invitation link via email.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
                            <p className="text-xs text-slate-500">
                                Please check your inbox (and spam folder) for further updates.
                            </p>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    if (sourceUrlRef.current) {
                                        window.location.href = sourceUrlRef.current;
                                    } else {
                                        router.push(`/jobs/${id}`);
                                    }
                                }}
                            >
                                {sourceUrlRef.current?.includes('linkedin') ? 'Return to LinkedIn' : sourceUrlRef.current?.includes('indeed') ? 'Return to Indeed' : 'Return to Job Posting'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl">
                <Link
                    href={`/jobs/${id}`}
                    className="mb-6 inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Job Details
                </Link>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Apply for {job.title}</h1>
                    <p className="mt-2 text-lg text-slate-600">
                        {job.company_name} • {job.location || 'Remote'}
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Application Form</CardTitle>
                        <CardDescription>
                            Please fill out the form below to apply. Fields marked with * are required.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="full_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Full Name *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="John Doe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid gap-6 md:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email *</FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="john@example.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="phone_number"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Phone Number *</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="+1 (555) 000-0000" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="skills"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Key Skills *</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="React, Node.js, TypeScript" {...field} />
                                                </FormControl>
                                                <FormDescription>Separate skills with commas</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="experience_years"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Years of Experience *</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min="0" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="cover_letter"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cover Letter (Optional)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Tell us why you're a great fit for this role..."
                                                    className="min-h-[120px]"
                                                    rows={5}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="linkedin_url"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>LinkedIn Profile URL</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://linkedin.com/in/johndoe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="resume_file"
                                    render={({ field: { onChange, value, ...field } }) => (
                                        <FormItem>
                                            <FormLabel>Resume / CV *</FormLabel>
                                            <FormControl>
                                                <div className="flex flex-col gap-2">
                                                    <label
                                                        htmlFor="resume-upload"
                                                        className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm font-medium text-slate-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
                                                    >
                                                        <Upload className="h-5 w-5" />
                                                        {resumeFile ? resumeFile.name : "Click to upload resume (PDF, DOC, DOCX)"}
                                                    </label>
                                                    <input
                                                        id="resume-upload"
                                                        type="file"
                                                        accept=".pdf,.doc,.docx"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                setResumeFile(file);
                                                                onChange(file);
                                                            }
                                                        }}
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormDescription>
                                                Upload your resume in PDF, DOC, or DOCX format (max 5MB)
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        "Submit Application"
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
