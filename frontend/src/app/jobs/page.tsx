"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Briefcase,
    MapPin,
    DollarSign,
    Clock,
    Users,
    Search,
    SlidersHorizontal,
    Sparkles,
    TrendingUp,
    Zap,
    Loader2
} from "lucide-react";
import Link from "next/link";
import { jobsApi } from "@/lib/api";
import type { Job } from "@/lib/types";

export default function JobsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [locationFilter, setLocationFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch jobs from the backend
    useEffect(() => {
        const fetchJobs = async () => {
            try {
                setIsLoading(true);
                setError(null);
                // Fetch published jobs from the public endpoint (no authentication required)
                const fetchedJobs = await jobsApi.getPublic({ limit: 100 });
                setJobs(fetchedJobs);
            } catch (err: any) {
                console.error("Failed to fetch jobs:", err);
                setError(err.message || "Failed to load jobs. Please try again later.");
                setJobs([]); // Show empty state on error
            } finally {
                setIsLoading(false);
            }
        };

        fetchJobs();
    }, []);

    const filteredJobs = jobs.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.required_skills?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase())) ||
            job.preferred_skills?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesLocation = locationFilter === "all" ||
            (locationFilter === "remote" && (job.location?.toLowerCase().includes("remote") || job.location_type === "remote")) ||
            (locationFilter === "onsite" && job.location && !job.location.toLowerCase().includes("remote"));

        const matchesType = typeFilter === "all" || job.job_type?.toLowerCase() === typeFilter.toLowerCase();

        return matchesSearch && matchesLocation && matchesType;
    });

    // Helper function to format salary
    const formatSalary = (job: Job) => {
        if (job.salary_range) return job.salary_range;
        if (job.salary_min && job.salary_max) {
            return `${job.salary_currency || '$'}${job.salary_min.toLocaleString()} - ${job.salary_currency || '$'}${job.salary_max.toLocaleString()}`;
        }
        if (job.salary_min) {
            return `${job.salary_currency || '$'}${job.salary_min.toLocaleString()}+`;
        }
        return "Competitive";
    };

    // Helper function to calculate days ago
    const getDaysAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Helper function to get company logo initials
    const getCompanyInitials = (companyName?: string) => {
        if (!companyName) return "CO";
        return companyName
            .split(" ")
            .map(word => word[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                            <Sparkles className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Evalyn
                        </span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-8">
                        <Link href="/jobs" className="text-slate-900 font-medium">Browse Jobs</Link>
                        <Link href="/login" className="text-slate-600 hover:text-slate-900">For Employers</Link>
                        <Button onClick={() => window.location.href = "/login"}>Post a Job</Button>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <section className="container mx-auto px-6 py-12 md:py-16">
                <div className="max-w-3xl mx-auto text-center space-y-6">
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                        <Zap className="h-3 w-3 mr-1" />
                        AI-Powered Matching
                    </Badge>

                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
                        Find Your Dream Job
                    </h1>

                    <p className="text-xl text-slate-600">
                        {isLoading ? "Loading..." : `${filteredJobs.length} AI-vetted positions available. Apply now and get interviewed by AI.`}
                    </p>

                    {/* Search Bar */}
                    <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <Input
                                placeholder="Search jobs, companies, or skills..."
                                className="pl-10 h-12 border-0 focus-visible:ring-1"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <Select value={locationFilter} onValueChange={setLocationFilter}>
                            <SelectTrigger className="w-full md:w-[180px] h-12 border-0">
                                <SelectValue placeholder="Location" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Locations</SelectItem>
                                <SelectItem value="remote">Remote</SelectItem>
                                <SelectItem value="onsite">On-site</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-full md:w-[160px] h-12 border-0">
                                <SelectValue placeholder="Job Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="full_time">Full-time</SelectItem>
                                <SelectItem value="part_time">Part-time</SelectItem>
                                <SelectItem value="contract">Contract</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button className="h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                            <Search className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">Search</span>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="container mx-auto px-6 pb-8">
                <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <p className="text-3xl font-bold text-blue-600">{isLoading ? "..." : filteredJobs.length}</p>
                            <p className="text-sm text-slate-500 mt-1">Open Positions</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <p className="text-3xl font-bold text-purple-600">87%</p>
                            <p className="text-sm text-slate-500 mt-1">Match Rate</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <p className="text-3xl font-bold text-green-600">24h</p>
                            <p className="text-sm text-slate-500 mt-1">Avg Response</p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Job Listings */}
            <section className="container mx-auto px-6 pb-16">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">
                            {isLoading ? "Loading Jobs..." : `${filteredJobs.length} Jobs Found`}
                        </h2>
                        <Button variant="outline" size="sm">
                            <SlidersHorizontal className="h-4 w-4 mr-2" />
                            Filters
                        </Button>
                    </div>

                    {isLoading ? (
                        <Card className="p-12 text-center">
                            <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
                            <p className="text-slate-500 text-lg mt-4">Loading amazing opportunities...</p>
                        </Card>
                    ) : error ? (
                        <Card className="p-12 text-center border-red-200 bg-red-50">
                            <p className="text-red-600 text-lg">{error}</p>
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() => window.location.reload()}
                            >
                                Retry
                            </Button>
                        </Card>
                    ) : filteredJobs.length === 0 ? (
                        <Card className="p-12 text-center">
                            <p className="text-slate-500 text-lg">No jobs found matching your criteria.</p>
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() => {
                                    setSearchQuery("");
                                    setLocationFilter("all");
                                    setTypeFilter("all");
                                }}
                            >
                                Clear Filters
                            </Button>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {filteredJobs.map((job) => (
                                <Card key={job.id} className="hover:shadow-lg transition-all border-2 hover:border-blue-200">
                                    <CardContent className="p-6">
                                        <div className="flex gap-4">
                                            {/* Company Logo */}
                                            <div className="flex-shrink-0">
                                                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                                    {getCompanyInitials(job.company_name)}
                                                </div>
                                            </div>

                                            {/* Job Info */}
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <Link href={`/jobs/${job.id}`}>
                                                            <h3 className="text-xl font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                                                                {job.title}
                                                            </h3>
                                                        </Link>
                                                        <p className="text-slate-700 font-medium mt-1">{job.company_name || "Company"}</p>
                                                    </div>
                                                    <Button
                                                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                                        onClick={() => window.location.href = `/jobs/${job.id}/apply`}
                                                    >
                                                        Apply Now
                                                    </Button>
                                                </div>

                                                <p className="text-slate-600 mt-3 line-clamp-2">
                                                    {job.short_description || job.description}
                                                </p>

                                                <div className="flex flex-wrap gap-2 mt-4">
                                                    {(job.required_skills || []).slice(0, 4).map((skill) => (
                                                        <Badge key={skill} variant="secondary" className="bg-blue-50 text-blue-700">
                                                            {skill}
                                                        </Badge>
                                                    ))}
                                                    {(job.required_skills?.length || 0) > 4 && (
                                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                                                            +{(job.required_skills?.length || 0) - 4} more
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-500">
                                                    {job.location && (
                                                        <div className="flex items-center gap-1">
                                                            <MapPin className="h-4 w-4" />
                                                            {job.location}
                                                        </div>
                                                    )}
                                                    {job.job_type && (
                                                        <div className="flex items-center gap-1">
                                                            <Briefcase className="h-4 w-4" />
                                                            {job.job_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1">
                                                        <DollarSign className="h-4 w-4" />
                                                        {formatSalary(job)}
                                                    </div>
                                                    {job.created_at && (
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="h-4 w-4" />
                                                            {getDaysAgo(job.created_at)}d ago
                                                        </div>
                                                    )}
                                                    {job.application_count !== undefined && (
                                                        <div className="flex items-center gap-1">
                                                            <Users className="h-4 w-4" />
                                                            {job.application_count} applicants
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="container mx-auto px-6 pb-16">
                <Card className="bg-gradient-to-br from-blue-600 to-purple-600 border-0 max-w-4xl mx-auto">
                    <CardContent className="py-12 text-center text-white space-y-4">
                        <h2 className="text-3xl font-bold">Can't find the right role?</h2>
                        <p className="text-blue-100 text-lg">
                            Create a profile and let AI match you with opportunities
                        </p>
                        <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 mt-4">
                            <TrendingUp className="mr-2 h-5 w-5" />
                            Create Profile
                        </Button>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
