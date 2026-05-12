"use client";

import { motion } from "framer-motion";
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
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eye, Search, Filter, Loader2, Trash2, Download } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default function ApplicationsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [cityFilter, setCityFilter] = useState("all");
    const [applications, setApplications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDownloading, setIsDownloading] = useState(false);

    const fetchApplications = async () => {
        try {
            const res = await api.applications.list();
            setApplications(res);
            setSelectedIds(new Set((res as any[]).map((app) => app.id)));
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
            fetchApplications();
        } catch (err: any) {
            console.error("Delete error:", err);
            toast.error(`Failed to delete application: ${err.message || "Unauthorized"}`);
        }
    };

    const getInitials = (name: string) =>
        name ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "??";

    const filteredApps = Array.isArray(applications) ? applications.filter(app => {
        const candidateName = app?.candidate?.full_name || "Unknown Candidate";
        const jobTitle = app?.job?.title || "Unknown Job";
        const email = app?.candidate?.email || "";
        const term = searchTerm.toLowerCase();

        const matchesSearch = (
            candidateName.toLowerCase().includes(term) ||
            jobTitle.toLowerCase().includes(term) ||
            email.toLowerCase().includes(term)
        );

        if (cityFilter !== "all") {
            const appCity = app.city ? app.city.toLowerCase() : "unknown";
            if (appCity !== cityFilter.toLowerCase()) return false;
        }

        return matchesSearch;
    }) : [];

    const allFilteredSelected = filteredApps.length > 0 && filteredApps.every(app => selectedIds.has(app.id));
    const someFilteredSelected = filteredApps.some(app => selectedIds.has(app.id));

    const handleSelectAll = () => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allFilteredSelected) {
                filteredApps.forEach(app => next.delete(app.id));
            } else {
                filteredApps.forEach(app => next.add(app.id));
            }
            return next;
        });
    };

    const handleSelectOne = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleDownloadResumes = async () => {
        const toDownload = applications.filter(app => selectedIds.has(app.id) && app.candidate?.candidate_profile?.resume_url);
        if (toDownload.length === 0) {
            toast.error("No resumes available for the selected applications");
            return;
        }
        setIsDownloading(true);
        const zip = new JSZip();
        let failed = 0;

        await Promise.all(toDownload.map(async (app) => {
            try {
                const resumeUrl = app.candidate?.candidate_profile?.resume_url;
                const response = await fetch(resumeUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const blob = await response.blob();
                const name = (app.candidate?.full_name || "Unknown")
                    .replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "_");
                const job = (app.job?.title || "Unknown_Job")
                    .replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "_");
                zip.file(`${name}_${job}.pdf`, blob);
            } catch {
                failed++;
            }
        }));

        try {
            const content = await zip.generateAsync({ type: "blob" });
            const date = new Date().toISOString().split("T")[0];
            saveAs(content, `resumes_${date}.zip`);
            if (failed > 0) {
                toast.warning(`Downloaded ${toDownload.length - failed} resume(s). ${failed} failed.`);
            } else {
                toast.success(`${toDownload.length} resume(s) bundled and downloaded`);
            }
        } catch {
            toast.error("Failed to generate ZIP file");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDownloadSingle = async (app: any) => {
        try {
            const response = await fetch(app.candidate?.candidate_profile?.resume_url);
            if (!response.ok) throw new Error();
            const blob = await response.blob();
            const name = (app.candidate?.full_name || "Unknown").replace(/\s+/g, "_");
            const job = (app.job?.title || "Unknown_Job").replace(/\s+/g, "_");
            saveAs(blob, `${name}_${job}.pdf`);
        } catch {
            toast.error("Failed to download resume");
        }
    };

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
                <div className="flex gap-2 w-full md:w-auto flex-wrap">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search candidates..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="flex h-10 w-full sm:w-32 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:focus-visible:ring-indigo-600"
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                    >
                        <option value="all">All Cities</option>
                        <option value="haripur">Haripur</option>
                        <option value="islamabad">Islamabad</option>
                        <option value="lahore">Lahore</option>
                        <option value="karachi">Karachi</option>
                    </select>
                    <Button variant="outline" size="icon">
                        <Filter className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 dark:hover:bg-indigo-950/40"
                        onClick={handleDownloadResumes}
                        disabled={selectedIds.size === 0 || isDownloading}
                    >
                        {isDownloading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}
                        Download Resumes ({selectedIds.size})
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
                                    <TableHead className="w-10 pl-4">
                                        <input
                                            type="checkbox"
                                            checked={allFilteredSelected}
                                            ref={(el) => {
                                                if (el) el.indeterminate = !allFilteredSelected && someFilteredSelected;
                                            }}
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                        />
                                    </TableHead>
                                    <TableHead className="w-[250px] pl-4">Candidate</TableHead>
                                    <TableHead>City</TableHead>
                                    <TableHead>Qualification</TableHead>
                                    <TableHead>Job Role</TableHead>
                                    <TableHead>Applied</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Email Invite</TableHead>
                                    <TableHead>Salary</TableHead>
                                    <TableHead className="text-center">AI Score</TableHead>
                                    <TableHead className="text-right pr-6">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredApps.map((app) => (
                                    <TableRow
                                        key={app.id}
                                        className={`group cursor-pointer transition-colors ${
                                            selectedIds.has(app.id)
                                                ? "bg-indigo-50/70 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                                                : "hover:bg-slate-50 dark:hover:bg-slate-900/50"
                                        }`}
                                    >
                                        <TableCell className="pl-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(app.id)}
                                                onChange={() => handleSelectOne(app.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                            />
                                        </TableCell>
                                        <TableCell className="pl-4 font-medium">
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
                                            {app.city ? (
                                                <span className="capitalize">{app.city}</span>
                                            ) : (
                                                <span className="text-muted-foreground italic">Unknown</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {app.qualification ? (
                                                <span className="capitalize">{app.qualification}</span>
                                            ) : (
                                                <span className="text-muted-foreground italic">N/A</span>
                                            )}
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
                                        <TableCell>
                                            {(app.email_delivery_status && app.email_delivery_status !== 'PENDING') ? (
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${app.email_delivery_status === 'SENT' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                    <span className="text-xs font-medium uppercase tracking-wider">
                                                        {app.email_delivery_status}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">Not Shortlisted</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {app.expected_salary ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-medium">
                                                        {Number(app.expected_salary).toLocaleString()}
                                                    </span>
                                                    {app.salary_filter_status === 'within_budget' && (
                                                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 w-fit">
                                                            Within Budget
                                                        </span>
                                                    )}
                                                    {app.salary_filter_status === 'above_budget' && (
                                                        <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 w-fit">
                                                            Above Budget
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                <ScoreRing score={app.match_score || app.ai_score || 0} size="sm" animate={false} />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-2">
                                                {app.candidate?.candidate_profile?.resume_url && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        title="Download resume"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDownloadSingle(app);
                                                        }}
                                                    >
                                                        <Download className="w-4 h-4" />
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
                                        <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
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
