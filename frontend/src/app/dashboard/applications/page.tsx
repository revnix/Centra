"use client";

import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
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
import { Eye, Search, Filter, Loader2, Bot, Trash2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function ApplicationsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [applications, setApplications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchApplications = async () => {
        try {
            const res = await api.applications.list();
            setApplications(res);
        } catch (error: any) {
            console.error("Failed to fetch applications:", error);
            toast.error(`Error loading applications: ${error.message || 'Please try again'}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to permanently delete the application for ${name}? This will remove all interview data and cannot be undone.`)) {
            return;
        }

        try {
            await api.applications.delete(id);
            toast.success(`Application for ${name} deleted successfully`);
            fetchApplications(); // Refresh list
        } catch (err: any) {
            console.error("Delete error:", err);
            toast.error(`Failed to delete application: ${err.message || "Unauthorized"}`);
        }
    };

    const getInitials = (name: string) => name ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "??";

    const filteredApps = Array.isArray(applications) ? applications.filter(app => {
        const candidateName = app?.candidate?.full_name || "Unknown Candidate";
        const jobTitle = app?.job?.title || "Unknown Job";
        const email = app?.candidate?.email || "";
        const term = searchTerm.toLowerCase();

        return (
            candidateName.toLowerCase().includes(term) ||
            jobTitle.toLowerCase().includes(term) ||
            email.toLowerCase().includes(term)
        );
    }) : [];

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

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
                                                        {getInitials(app.candidate?.full_name || "Unknown Candidate")}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span>{app.candidate?.full_name || "Unknown"}</span>
                                                    <span className="text-xs text-muted-foreground font-normal">{app.candidate?.email || "No email"}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {app.job?.title || "Unknown Job"}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {app.created_at ? formatDistanceToNow(new Date(app.created_at), { addSuffix: true }) : "N/A"}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={app.status || "APPLIED"} />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                <ScoreRing score={app.match_score || app.ai_score || 0} size="sm" animate={false} />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-2">
                                                {!['INTERVIEW_COMPLETED', 'HIRED', 'REJECTED'].includes(app.status) && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                const session = await api.interviews.create(app.id);
                                                                window.open(`/interview/${session.token}`, "_blank");
                                                            } catch (err) {
                                                                toast.error("Failed to create interview session");
                                                            }
                                                        }}
                                                    >
                                                        Interview <Bot className="w-4 h-4 ml-1" />
                                                    </Button>
                                                )}
                                                <Link href={`/dashboard/applications/${app.id}`}>
                                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Review <Eye className="w-4 h-4 ml-2" />
                                                    </Button>
                                                </Link>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(app.id, app.candidate?.full_name || "Unknown");
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
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
