"use client";

import { useState } from "react";
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
    Zap
} from "lucide-react";
import Link from "next/link";

// Mock job data
const mockJobs = [
    {
        id: "1",
        title: "Senior Frontend Engineer",
        company: "TechCorp Inc.",
        location: "Remote",
        type: "Full-time",
        salary: "$120k - $160k",
        description: "Build cutting-edge web applications with React and TypeScript",
        applicants: 45,
        postedDays: 3,
        tags: ["React", "TypeScript", "Next.js"],
        logo: "TC"
    },
    {
        id: "2",
        title: "Backend Engineer",
        company: "DataFlow Systems",
        location: "New York, NY",
        type: "Full-time",
        salary: "$130k - $170k",
        description: "Design and build scalable microservices architecture",
        applicants: 32,
        postedDays: 5,
        tags: ["Python", "AWS", "PostgreSQL"],
        logo: "DF"
    },
    {
        id: "3",
        title: "Product Designer",
        company: "Creative Labs",
        location: "San Francisco, CA",
        type: "Full-time",
        salary: "$100k - $140k",
        description: "Create beautiful and intuitive user experiences",
        applicants: 28,
        postedDays: 2,
        tags: ["Figma", "UI/UX", "Design Systems"],
        logo: "CL"
    },
    {
        id: "4",
        title: "Data Scientist",
        company: "AI Solutions",
        location: "Remote",
        type: "Full-time",
        salary: "$140k - $180k",
        description: "Build ML models to solve complex business problems",
        applicants: 51,
        postedDays: 7,
        tags: ["Python", "ML", "TensorFlow"],
        logo: "AI"
    },
    {
        id: "5",
        title: "DevOps Engineer",
        company: "CloudTech",
        location: "Austin, TX",
        type: "Full-time",
        salary: "$110k - $150k",
        description: "Manage infrastructure and CI/CD pipelines",
        applicants: 19,
        postedDays: 4,
        tags: ["Docker", "Kubernetes", "AWS"],
        logo: "CT"
    },
    {
        id: "6",
        title: "Mobile Developer",
        company: "AppWorks",
        location: "Remote",
        type: "Contract",
        salary: "$90k - $130k",
        description: "Build native mobile apps for iOS and Android",
        applicants: 23,
        postedDays: 6,
        tags: ["React Native", "iOS", "Android"],
        logo: "AW"
    }
];

export default function JobsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [locationFilter, setLocationFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");

    const filteredJobs = mockJobs.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesLocation = locationFilter === "all" ||
            (locationFilter === "remote" && job.location === "Remote") ||
            (locationFilter === "onsite" && job.location !== "Remote");

        const matchesType = typeFilter === "all" || job.type.toLowerCase() === typeFilter;

        return matchesSearch && matchesLocation && matchesType;
    });

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
                        {mockJobs.length} AI-vetted positions available. Apply now and get interviewed by AI.
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
                                <SelectItem value="full-time">Full-time</SelectItem>
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
                            <p className="text-3xl font-bold text-blue-600">{filteredJobs.length}</p>
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
                            {filteredJobs.length} Jobs Found
                        </h2>
                        <Button variant="outline" size="sm">
                            <SlidersHorizontal className="h-4 w-4 mr-2" />
                            Filters
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {filteredJobs.map((job) => (
                            <Card key={job.id} className="hover:shadow-lg transition-all border-2 hover:border-blue-200">
                                <CardContent className="p-6">
                                    <div className="flex gap-4">
                                        {/* Company Logo */}
                                        <div className="flex-shrink-0">
                                            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                                {job.logo}
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
                                                    <p className="text-slate-700 font-medium mt-1">{job.company}</p>
                                                </div>
                                                <Button
                                                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                                    onClick={() => window.location.href = `/jobs/${job.id}/apply`}
                                                >
                                                    Apply Now
                                                </Button>
                                            </div>

                                            <p className="text-slate-600 mt-3 line-clamp-2">{job.description}</p>

                                            <div className="flex flex-wrap gap-2 mt-4">
                                                {job.tags.map((tag) => (
                                                    <Badge key={tag} variant="secondary" className="bg-blue-50 text-blue-700">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-500">
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
                                                    {job.postedDays}d ago
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Users className="h-4 w-4" />
                                                    {job.applicants} applicants
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {filteredJobs.length === 0 && (
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
