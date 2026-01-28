"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MOCK_APPLICATIONS, MOCK_JOBS } from "@/lib/mock-data";
import { StatusBadge } from "@/components/ui/status-badge";
import { ScoreRing } from "@/components/ui/score-ring";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eye, Search, Filter } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function ApplicationsPage() {
    const [searchTerm, setSearchTerm] = useState("");

    const getJobTitle = (id: number) => MOCK_JOBS.find(j => j.id === id)?.title || "Unknown Job";

    const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

    const filteredApps = MOCK_APPLICATIONS.filter(app =>
        app.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getJobTitle(app.jobId).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
                    <p className="text-muted-foreground mt-1">Review candidates and their AI interview scores.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search candidates..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon">
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Card className="border-border shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[250px] pl-6">Candidate</TableHead>
                                    <TableHead>Job Role</TableHead>
                                    <TableHead>Applied</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-center">AI Score</TableHead>
                                    <TableHead className="text-right pr-6">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredApps.map((app) => (
                                    <TableRow key={app.id} className="group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                        <TableCell className="pl-6 font-medium">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border border-border">
                                                    <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                                                        {getInitials(app.candidateName)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span>{app.candidateName}</span>
                                                    <span className="text-xs text-muted-foreground font-normal">{app.candidateEmail}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getJobTitle(app.jobId)}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {app.appliedAt}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={app.status} />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                <ScoreRing score={app.aiScore} size="sm" animate={false} />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Link href={`/dashboard/applications/${app.id}`}>
                                                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Review <Eye className="w-4 h-4 ml-2" />
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {filteredApps.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No applications found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
