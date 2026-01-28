"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, Briefcase, Clock, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";

export default function JobsPage() {
    const [searchTerm, setSearchTerm] = useState("");

    const { data: jobs, isLoading, error } = useQuery({
        queryKey: ["jobs"],
        queryFn: api.jobs.list,
    });

    const filteredJobs = jobs?.filter((job: any) =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.department?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto space-y-12">

                {/* Header Section */}
                <div className="text-center space-y-6">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                    >
                        Join Our Team
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-muted-foreground max-w-2xl mx-auto"
                    >
                        We're building the future of hiring with AI. Explore our open positions and find your next challenge.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="relative max-w-xl mx-auto"
                    >
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder="Search by role or department..."
                                className="pl-10 h-12 text-lg rounded-full shadow-lg border-muted/20 focus-visible:ring-indigo-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </motion.div>
                </div>

                {/* Job Grid */}
                <div className="grid gap-6">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="space-y-3">
                                <Skeleton className="h-[125px] w-full rounded-xl" />
                            </div>
                        ))
                    ) : error ? (
                        <div className="text-center py-12 text-red-500">
                            Failed to load jobs. Please try again later.
                        </div>
                    ) : (
                        filteredJobs.map((job: any, index: number) => (
                            <motion.div
                                key={job.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 + 0.3 }}
                            >
                                <Link href={`/portal/jobs/${job.id}`}>
                                    <div className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-border p-6 md:p-8 hover:shadow-xl transition-all duration-300 hover:border-indigo-500/50 cursor-pointer overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-50/50 group-hover:to-transparent dark:group-hover:from-indigo-950/30 transition-all duration-500" />

                                        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="space-y-3 flex-1">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                                                        {job.department || 'General'}
                                                    </Badge>
                                                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5" /> {new Date(job.created_at || Date.now()).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                <h3 className="text-2xl font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {job.title}
                                                </h3>

                                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1.5">
                                                        <MapPin className="w-4 h-4" /> {job.location || 'Remote'}
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <Briefcase className="w-4 h-4" /> {job.type || 'Full-time'}
                                                    </span>
                                                    <span className="text-foreground font-medium">
                                                        {job.salary_range || 'Competitive'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center">
                                                <Button className="w-full md:w-auto rounded-full px-6 group-hover:bg-indigo-600 transition-all">
                                                    View Details
                                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        )))}

                    {filteredJobs.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            No jobs found matching your search.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
