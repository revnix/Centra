"use client";

import { use, useState } from "react";
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
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const applicationSchema = z.object({
    full_name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone_number: z.string().min(10, "Phone number must be at least 10 digits"),
    resume_url: z.string().url("Please provide a valid URL to your resume (e.g. LinkedIn, Google Drive)").optional().or(z.literal("")),
    cover_letter: z.string().optional(),
    linkedin_url: z.string().url("Invalid LinkedIn URL").optional().or(z.literal("")),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

export default function JobApplicationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { data: job, isLoading: isJobLoading } = useJob(id);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const form = useForm<ApplicationFormValues>({
        resolver: zodResolver(applicationSchema),
        defaultValues: {
            full_name: "",
            email: "",
            phone_number: "",
            resume_url: "",
            cover_letter: "",
            linkedin_url: "",
        },
    });

    const onSubmit = async (data: ApplicationFormValues) => {
        setIsSubmitting(true);
        try {
            await api.applications.guestApply({
                job_id: parseInt(id),
                full_name: data.full_name,
                email: data.email,
                phone_number: data.phone_number,
                resume_url: data.resume_url || undefined,
                cover_letter: data.cover_letter || undefined,
                linkedin_url: data.linkedin_url || undefined,
                skills: [], // Can be enhanced to extract skills or ask user
                experience_years: 0, // Can add field if needed
            });
            setIsSuccess(true);
            toast.success("Application submitted successfully!");
        } catch (error: any) {
            console.error("Application error:", error);
            toast.error(error.message || "Failed to submit application. Please try again.");
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
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl">Application Received!</CardTitle>
                        <CardDescription>
                            Thanks for applying to <strong>{job.title}</strong> at {job.company_name}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-slate-600">
                            We have sent a confirmation email to <strong>{form.getValues().email}</strong>.
                            Our team will review your application and get back to you shortly.
                        </p>
                        <Link href={`/jobs/${id}`}>
                            <Button className="w-full">Return to Job Posting</Button>
                        </Link>
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
                                    name="resume_url"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Resume / Portfolio URL</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://website.com/resume.pdf" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Please provide a link to your resume (e.g., Google Drive, Dropbox, or personal website).
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="cover_letter"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cover Letter</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Tell us why you're a great fit for this role..."
                                                    className="min-h-[150px]"
                                                    {...field}
                                                />
                                            </FormControl>
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
