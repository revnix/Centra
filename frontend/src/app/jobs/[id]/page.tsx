"use client";

import { use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Briefcase,
    MapPin,
    DollarSign,
    Clock,
    Users,
    Sparkles,
    CheckCircle2,
    Building2,
    Calendar,
    Share2,
    Bookmark,
    ArrowLeft,
    ArrowRight
} from "lucide-react";
import Link from "next/link";

// Mock job data
const jobData: Record<string, any> = {
    "1": {
        id: "1",
        title: "Senior Frontend Engineer",
        company: "TechCorp Inc.",
        location: "Remote",
        type: "Full-time",
        salary: "$120k - $160k",
        applicants: 45,
        postedDays: 3,
        logo: "TC",

        description: `We're looking for an experienced Frontend Engineer to join our growing team. You'll be building modern web applications using React, TypeScript, and Next.js.

This is a unique opportunity to work on cutting-edge projects that impact millions of users while working with a talented team of engineers.`,

        responsibilities: [
            "Build and maintain high-quality web applications using React and TypeScript",
            "Collaborate with designers to implement pixel-perfect UI components",
            "Optimize application performance and ensure excellent user experience",
            "Write clean, maintainable code with comprehensive test coverage",
            "Mentor junior developers and contribute to code reviews",
            "Participate in architectural decisions and technical planning"
        ],

        requirements: [
            "5+ years of professional experience with React and modern JavaScript",
            "Strong proficiency in TypeScript and Next.js",
            "Experience with state management (Redux, Zustand, or similar)",
            "Deep understanding of web performance optimization",
            "Excellent problem-solving and communication skills",
            "Bachelor's degree in Computer Science or equivalent experience"
        ],

        niceToHave: [
            "Experience with GraphQL and Apollo Client",
            "Knowledge of serverless architectures",
            "Contributions to open-source projects",
            "Experience with design systems and component libraries"
        ],

        benefits: [
            "Competitive salary and equity package",
            "Comprehensive health, dental, and vision insurance",
            "401(k) with company match",
            "Flexible remote work policy",
            "Unlimited PTO and paid parental leave",
            "Professional development budget",
            "Latest MacBook Pro and equipment",
            "Annual company retreats"
        ],

        aboutCompany: `TechCorp is a fast-growing technology company building the future of work. We're backed by top-tier investors and have raised $50M in funding. Our mission is to empower teams to collaborate more effectively through innovative software solutions.

We value diversity, creativity, and continuous learning. Our team of 150+ employees works remotely from 25+ countries, creating a truly global and inclusive culture.`,

        applicationProcess: [
            "Submit your application (5 minutes)",
            "AI-powered interview (30 minutes)",
            "Coding challenge (45 minutes)",
            "Team review and decision (2-3 days)",
            "Offer and onboarding"
        ],

        tags: ["React", "TypeScript", "Next.js", "TailwindCSS", "GraphQL"]
    }
};

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const job = jobData[id] || jobData["1"]; // Fallback to job 1

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/jobs" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
                        <ArrowLeft className="h-5 w-5" />
                        <span>Back to Jobs</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm">
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                        </Button>
                        <Button variant="outline" size="sm">
                            <Bookmark className="h-4 w-4 mr-2" />
                            Save
                        </Button>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-6 py-8">
                <div className="max-w-5xl mx-auto">
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Job Header */}
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex gap-4">
                                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                                            {job.logo}
                                        </div>
                                        <div className="flex-1">
                                            <h1 className="text-3xl font-bold text-slate-900">{job.title}</h1>
                                            <p className="text-lg text-slate-700 font-medium mt-1">{job.company}</p>

                                            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-600">
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="h-4 w-4" />
                                                    {job.location}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Briefcase className="h-4 w-4" />
                                                    {job.type}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <DollarSign className="h-4 w-4" />
                                                    {job.salary}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-4 w-4" />
                                                    Posted {job.postedDays}d ago
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Users className="h-4 w-4" />
                                                    {job.applicants} applicants
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 mt-4">
                                                {job.tags.map((tag: string) => (
                                                    <Badge key={tag} variant="secondary" className="bg-blue-50 text-blue-700">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Description */}
                            <Card>
                                <CardContent className="p-6 space-y-6">
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900 mb-3">About the Role</h2>
                                        <p className="text-slate-600 whitespace-pre-line leading-relaxed">{job.description}</p>
                                    </div>

                                    <Separator />

                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900 mb-3">Responsibilities</h2>
                                        <ul className="space-y-2">
                                            {job.responsibilities.map((item: string, i: number) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                    <span className="text-slate-600">{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <Separator />

                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900 mb-3">Requirements</h2>
                                        <ul className="space-y-2">
                                            {job.requirements.map((item: string, i: number) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                                    <span className="text-slate-600">{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <Separator />

                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900 mb-3">Nice to Have</h2>
                                        <ul className="space-y-2">
                                            {job.niceToHave.map((item: string, i: number) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                                                    <span className="text-slate-600">{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <Separator />

                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900 mb-3">Benefits</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {job.benefits.map((item: string, i: number) => (
                                                <div key={i} className="flex items-start gap-2">
                                                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                    <span className="text-slate-600">{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <Separator />

                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900 mb-3">About {job.company}</h2>
                                        <p className="text-slate-600 whitespace-pre-line leading-relaxed">{job.aboutCompany}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Application Process */}
                            <Card className="bg-blue-50 border-blue-200">
                                <CardContent className="p-6">
                                    <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-blue-600" />
                                        AI-Powered Hiring Process
                                    </h2>
                                    <ol className="space-y-3">
                                        {job.applicationProcess.map((step: string, i: number) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                                                    {i + 1}
                                                </div>
                                                <div className="pt-1">
                                                    <p className="text-slate-700 font-medium">{step}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-4">
                            {/* Apply Card */}
                            <Card className="sticky top-24">
                                <CardContent className="p-6 space-y-4">
                                    <Button
                                        size="lg"
                                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12 text-base"
                                        onClick={() => window.location.href = `/jobs/${job.id}/apply`}
                                    >
                                        Apply Now
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>

                                    <p className="text-sm text-slate-500 text-center">
                                        Takes 5 minutes • No account required
                                    </p>

                                    <Separator />

                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Calendar className="h-4 w-4" />
                                            <span>Posted {job.postedDays} days ago</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Users className="h-4 w-4" />
                                            <span>{job.applicants} applicants</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Building2 className="h-4 w-4" />
                                            <span>150+ employees</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Tips Card */}
                            <Card className="bg-purple-50 border-purple-200">
                                <CardContent className="p-6">
                                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-purple-600" />
                                        Application Tips
                                    </h3>
                                    <ul className="space-y-2 text-sm text-slate-700">
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                                            <span>Update your resume to highlight relevant experience</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                                            <span>Be prepared for AI interview within 24 hours</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                                            <span>Have a quiet space ready for your interview</span>
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
