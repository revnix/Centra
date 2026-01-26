import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MonitorPlay, CheckCircle2, Clock, XCircle, FileText } from "lucide-react";

export type ApplicationStatus =
    | "applied"
    | "screening"
    | "interviewing"
    | "offer"
    | "rejected"
    | "hired";

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
            color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
            icon: CheckCircle2
        },
        rejected: {
            label: "Rejected",
            color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
            icon: XCircle
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
