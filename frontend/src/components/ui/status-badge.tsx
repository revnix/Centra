import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    MonitorPlay,
    CheckCircle2,
    Clock,
    XCircle,
    FileText,
    UserCheck,
    Mail,
    Star,
    UserX,
    Briefcase,
    GraduationCap,
} from "lucide-react";

export type ApplicationStatus =
    | "applied"
    | "screening"
    | "shortlisted"
    | "interview_invited"
    | "interviewing"
    | "interview_pending"
    | "interview_in_progress"
    | "interview_completed"
    | "offer"
    | "onboarding"
    | "hired"
    | "rejected"
    | "withdrawn";

interface StatusBadgeProps {
    status: ApplicationStatus | string;
    className?: string;
    showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
    const normalizedStatus = status.toLowerCase() as ApplicationStatus;

    const config: Record<string, { label: string; color: string; icon: React.ElementType }> = {
        applied: {
            label: "Applied",
            color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
            icon: FileText,
        },
        screening: {
            label: "Screening",
            color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
            icon: Clock,
        },
        shortlisted: {
            label: "Shortlisted",
            color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800",
            icon: Star,
        },
        interview_invited: {
            label: "Invite Sent",
            color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800",
            icon: Mail,
        },
        interviewing: {
            label: "Interviewing",
            color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
            icon: MonitorPlay,
        },
        interview_pending: {
            label: "Interview Pending",
            color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
            icon: Clock,
        },
        interview_in_progress: {
            label: "In Interview",
            color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
            icon: MonitorPlay,
        },
        interview_completed: {
            label: "Interview Done",
            color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
            icon: CheckCircle2,
        },
        offer: {
            label: "Offer Sent",
            color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
            icon: Briefcase,
        },
        onboarding: {
            label: "Onboarding",
            color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
            icon: GraduationCap,
        },
        hired: {
            label: "Hired",
            color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
            icon: UserCheck,
        },
        rejected: {
            label: "Rejected",
            color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800",
            icon: XCircle,
        },
        withdrawn: {
            label: "Withdrawn",
            color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
            icon: UserX,
        },
    };

    const { label, color, icon: Icon } = config[normalizedStatus] ?? {
        label: status,
        color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200",
        icon: Clock,
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
