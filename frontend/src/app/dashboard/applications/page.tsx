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
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, Search, Filter, Loader2, Trash2, Mail, Send } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Application {
    id: string;
    status: string;
    match_score?: number;
    ai_score?: number;
    email_delivery_status?: string;
    email_logs?: string;
    city?: string;
    qualification?: string;
    expected_salary?: number;
    salary_filter_status?: string;
    created_at?: string;
    candidate?: { full_name?: string; email?: string };
    job?: { title?: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (name: string) =>
    name ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "??";

const defaultSubject = (jobTitle: string, candidateName: string) =>
    `Interview Invitation – ${jobTitle}`;

const defaultMessage = (candidateName: string, jobTitle: string) =>
    `We are pleased to inform you that after reviewing your application for the ${jobTitle} position, we would like to invite you for an interview.\n\nPlease reply to this email or contact us to schedule a convenient time.\n\nWe look forward to speaking with you.`;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [cityFilter, setCityFilter] = useState("all");
    const [applications, setApplications] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // ── Invite modal state
    const [inviteApp, setInviteApp] = useState<Application | null>(null);
    const [inviteSubject, setInviteSubject] = useState("");
    const [inviteMessage, setInviteMessage] = useState("");
    const [isSending, setIsSending] = useState(false);

    const fetchApplications = async () => {
        try {
            const res = await api.applications.list();
            setApplications(res);
        } catch (error: any) {
            console.error("Failed to fetch applications:", error);
            toast.error(`Error loading applications: ${error.message || "Please try again"}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    // ── Open invite modal
    const openInviteModal = (app: Application) => {
        const name = app.candidate?.full_name || "Candidate";
        const job = app.job?.title || "our open position";
        setInviteApp(app);
        setInviteSubject(defaultSubject(job, name));
        setInviteMessage(defaultMessage(name, job));
    };

    const closeInviteModal = () => {
        setInviteApp(null);
        setInviteSubject("");
        setInviteMessage("");
    };

    // ── Send invite
    const handleSendInvite = async () => {
        if (!inviteApp) return;
        if (!inviteSubject.trim() || !inviteMessage.trim()) {
            toast.error("Subject and message are required.");
            return;
        }

        setIsSending(true);
        try {
            await api.applications.invite(inviteApp.id, inviteSubject.trim(), inviteMessage.trim());
            toast.success(`Interview invitation sent to ${inviteApp.candidate?.email || "candidate"}!`);
            closeInviteModal();
            fetchApplications(); // refresh status
        } catch (err: any) {
            console.error("Invite error:", err);
            toast.error(`Failed to send invite: ${err.message || "Please try again."}`);
        } finally {
            setIsSending(false);
        }
    };

    // ── Delete
    const handleDelete = async (id: string, name: string) => {
        if (
            !window.confirm(
                `Are you sure you want to permanently delete the application for ${name}? This will remove all interview data and cannot be undone.`
            )
        )
            return;

        try {
            await api.applications.delete(id);
            toast.success(`Application for ${name} deleted successfully`);
            fetchApplications();
        } catch (err: any) {
            console.error("Delete error:", err);
            toast.error(`Failed to delete application: ${err.message || "Unauthorized"}`);
        }
    };

    // ── Filter
    const filteredApps = Array.isArray(applications)
        ? applications.filter((app) => {
              const candidateName = app?.candidate?.full_name || "Unknown Candidate";
              const jobTitle = app?.job?.title || "Unknown Job";
              const email = app?.candidate?.email || "";
              const term = searchTerm.toLowerCase();

              const matchesSearch =
                  candidateName.toLowerCase().includes(term) ||
                  jobTitle.toLowerCase().includes(term) ||
                  email.toLowerCase().includes(term);

              if (cityFilter !== "all") {
                  const appCity = app.city ? app.city.toLowerCase() : "unknown";
                  if (appCity !== cityFilter.toLowerCase()) return false;
              }

              return matchesSearch;
          })
        : [];

    // ── Loading
    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    // ── Render
    return (
        <div className="space-y-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
                    <p className="text-muted-foreground mt-1">
                        Review candidates, AI-scored automatically. Send interview invites manually.
                    </p>
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
                    <select
                        className="flex h-10 w-full sm:w-32 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950"
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
                </div>
            </div>

            {/* Table */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[220px] pl-6">Candidate</TableHead>
                                    <TableHead>City</TableHead>
                                    <TableHead>Qualification</TableHead>
                                    <TableHead>Job Role</TableHead>
                                    <TableHead>Applied</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Email Invite</TableHead>
                                    <TableHead>Salary</TableHead>
                                    <TableHead className="text-center">ATS Score</TableHead>
                                    <TableHead className="text-right pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredApps.map((app) => (
                                    <TableRow
                                        key={app.id}
                                        className="group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                                    >
                                        {/* Candidate */}
                                        <TableCell className="pl-6 font-medium">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border border-border">
                                                    <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                                                        {getInitials(app.candidate?.full_name || "Unknown Candidate")}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span>{app.candidate?.full_name || "Unknown"}</span>
                                                    <span className="text-xs text-muted-foreground font-normal">
                                                        {app.candidate?.email || "No email"}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* City */}
                                        <TableCell>
                                            {app.city ? (
                                                <span className="capitalize">{app.city}</span>
                                            ) : (
                                                <span className="text-muted-foreground italic">Unknown</span>
                                            )}
                                        </TableCell>

                                        {/* Qualification */}
                                        <TableCell>
                                            {app.qualification ? (
                                                <span className="capitalize">{app.qualification}</span>
                                            ) : (
                                                <span className="text-muted-foreground italic">N/A</span>
                                            )}
                                        </TableCell>

                                        {/* Job Role */}
                                        <TableCell>{app.job?.title || "Unknown Job"}</TableCell>

                                        {/* Applied */}
                                        <TableCell className="text-muted-foreground">
                                            {app.created_at
                                                ? formatDistanceToNow(new Date(app.created_at), { addSuffix: true })
                                                : "N/A"}
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell>
                                            <StatusBadge status={app.status || "APPLIED"} />
                                        </TableCell>

                                        {/* Email Invite Status */}
                                        <TableCell>
                                            {app.email_delivery_status === "SENT" ? (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                                                        Sent
                                                    </span>
                                                </div>
                                            ) : app.email_delivery_status === "FAILED" ? (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                                                    <span className="text-xs font-semibold text-rose-700 uppercase tracking-wide">
                                                        Failed
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">Pending</span>
                                            )}
                                        </TableCell>

                                        {/* Salary */}
                                        <TableCell>
                                            {app.expected_salary ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-medium">
                                                        {Number(app.expected_salary).toLocaleString()}
                                                    </span>
                                                    {app.salary_filter_status === "within_budget" && (
                                                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 w-fit">
                                                            Within Budget
                                                        </span>
                                                    )}
                                                    {app.salary_filter_status === "above_budget" && (
                                                        <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 w-fit">
                                                            Above Budget
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">—</span>
                                            )}
                                        </TableCell>

                                        {/* ATS Score */}
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                <ScoreRing
                                                    score={app.match_score ?? app.ai_score ?? 0}
                                                    size="sm"
                                                    animate={false}
                                                />
                                            </div>
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end items-center gap-1">
                                                {/* Invite for Interview */}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 gap-1.5"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openInviteModal(app);
                                                    }}
                                                    title="Send interview invitation email"
                                                >
                                                    <Mail className="w-3.5 h-3.5" />
                                                    Invite
                                                </Button>

                                                {/* Review */}
                                                <Link href={`/dashboard/applications/${app.id}`}>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        Review <Eye className="w-4 h-4 ml-1" />
                                                    </Button>
                                                </Link>

                                                {/* Delete */}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(
                                                            app.id,
                                                            app.candidate?.full_name || "Unknown"
                                                        );
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
                                        <TableCell
                                            colSpan={10}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            No applications found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </motion.div>

            {/* ── Invite for Interview Modal ────────────────────────────── */}
            <Dialog open={!!inviteApp} onOpenChange={(open) => { if (!open) closeInviteModal(); }}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Mail className="h-5 w-5 text-indigo-600" />
                            Invite for Interview
                        </DialogTitle>
                        <DialogDescription>
                            Compose a custom email to{" "}
                            <strong>{inviteApp?.candidate?.full_name || "the candidate"}</strong>{" "}
                            ({inviteApp?.candidate?.email || "—"}) for the{" "}
                            <strong>{inviteApp?.job?.title || "role"}</strong> position.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Subject */}
                        <div className="space-y-1.5">
                            <Label htmlFor="invite-subject" className="text-sm font-medium">
                                Subject
                            </Label>
                            <Input
                                id="invite-subject"
                                value={inviteSubject}
                                onChange={(e) => setInviteSubject(e.target.value)}
                                placeholder="Interview Invitation – Software Engineer"
                                className="focus-visible:ring-indigo-500"
                            />
                        </div>

                        {/* Message */}
                        <div className="space-y-1.5">
                            <Label htmlFor="invite-message" className="text-sm font-medium">
                                Message
                            </Label>
                            <textarea
                                id="invite-message"
                                rows={9}
                                value={inviteMessage}
                                onChange={(e) => setInviteMessage(e.target.value)}
                                placeholder="Write your custom message here…"
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 resize-none"
                            />
                            <p className="text-xs text-muted-foreground">
                                The candidate's name will be added as a greeting automatically.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={closeInviteModal} disabled={isSending}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSendInvite}
                            disabled={isSending || !inviteSubject.trim() || !inviteMessage.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                        >
                            {isSending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Sending…
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    Send Email
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
