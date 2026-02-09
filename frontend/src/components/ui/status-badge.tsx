import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MonitorPlay, CheckCircle2, Clock, XCircle, FileText } from "lucide-react";

export type ApplicationStatus =
    | "applied"
    | "screening"
    | "interviewing"
    | "offer"
    | "rejected"
    | "hired"
    | "interview_completed"
    | "interview_pending"
    | "interview_in_progress";

interface StatusBadgeProps {
    status: ApplicationStatus | string;
    className?: string;
    showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
    const normalizedStatus = status.toLowerCase() as ApplicationStatus;

    const config = {
        applied: {
            label: "Applied",
            color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
            icon: FileText
        },
        screening: {
            label: "Screening",
            color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
            icon: Clock
        },
        interviewing: {
            label: "Interviewing",
            color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
            icon: MonitorPlay
        },
        offer: {
            label: "Offer Sent",
            color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
            icon: CheckCircle2
        },
        hired: {
            label: "Hired",
            color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
            icon: CheckCircle2
        },
        rejected: {
            label: "Rejected",
            color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800",
            icon: XCircle
        },
        interview_completed: {
            label: "Interview Ready",
            color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
            icon: CheckCircle2
        },
        interview_pending: {
            label: "Interview Pending",
            color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
            icon: Clock
        },
        interview_in_progress: {
            label: "In Interview",
            color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
            icon: MonitorPlay
        },
    };

    const { label, color, icon: Icon } = config[normalizedStatus] || {
        label: status,
        color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
        icon: Clock
    };

    return (
        <Badge
            variant="outline"
            className={cn("px-2.5 py-0.5 text-xs font-semibold gap-1.5 transition-colors", color, className)}
        >
            {showIcon && <Icon className="w-3.5 h-3.5" />}
            {label}
        </Badge>
    );
}
