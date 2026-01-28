"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Briefcase, FileText, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                        Dashboard Overview
                    </h2>
                    <p className="text-muted-foreground mt-2">
                        Welcome back to Evalyn. Here's what's happening today.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Link href="/dashboard/applications">
                    <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
                        <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-indigo-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Applications
                                </CardTitle>
                                <Users className="h-4 w-4 text-indigo-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">12</div>
                                <p className="text-xs text-muted-foreground">
                                    +2 from yesterday
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Link>

                <Link href="/dashboard/jobs">
                    <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
                        <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-emerald-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Active Jobs
                                </CardTitle>
                                <Briefcase className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">3</div>
                                <p className="text-xs text-muted-foreground">
                                    1 draft pending review
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Link>

                <Link href="/dashboard/generated-jobs">
                    <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
                        <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-amber-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    AI Drafts
                                </CardTitle>
                                <Zap className="h-4 w-4 text-amber-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">5</div>
                                <p className="text-xs text-muted-foreground">
                                    Ready for review
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>
                            Latest actions across your workspace.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Placeholder activity list */}
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border">
                                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            New application received
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Frontend Developer • 2 hours ago
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="sm">View</Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>
                            Common tasks managed by AI.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Link href="/dashboard/jobs/new">
                            <Button className="w-full justify-between" variant="outline">
                                <span className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4" /> Post New Job
                                </span>
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                        <Link href="/dashboard/generated-jobs">
                            <Button className="w-full justify-between" variant="outline">
                                <span className="flex items-center gap-2">
                                    <Zap className="w-4 h-4" /> Generate with AI
                                </span>
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
