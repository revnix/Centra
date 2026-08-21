"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, "_");

  // Monochrome-only badge system (black/white/gray).
  const config: Record<string, { label: string; icon: any; cls: string }> = {
    applied: { label: "Applied", icon: Clock, cls: "border-border bg-background text-foreground" },
    screening: { label: "Screening", icon: Clock, cls: "border-border bg-muted text-foreground" },
    interview: { label: "Interview", icon: Clock, cls: "border-border bg-muted text-foreground" },
    assessment: { label: "Assessment", icon: Clock, cls: "border-border bg-muted text-foreground" },
    offer: { label: "Offer", icon: Clock, cls: "border-border bg-muted text-foreground" },
    onboarding: { label: "Onboarding", icon: Clock, cls: "border-border bg-muted text-foreground" },
    hired: { label: "Hired", icon: CheckCircle2, cls: "border-border bg-background text-foreground" },
    rejected: { label: "Rejected", icon: XCircle, cls: "border-border bg-background text-foreground" },
    cancelled: { label: "Cancelled", icon: XCircle, cls: "border-border bg-background text-foreground" },
    completed: { label: "Completed", icon: CheckCircle2, cls: "border-border bg-background text-foreground" },
    scheduled: { label: "Scheduled", icon: Clock, cls: "border-border bg-muted text-foreground" },
  };

  const { label, cls, icon: Icon } = config[normalizedStatus] ?? {
    label: status,
    cls: "border-border bg-background text-foreground",
    icon: Clock,
  };

  return (
    <Badge
      variant="outline"
      className={cn("px-2.5 py-0.5 text-xs font-semibold gap-1.5", cls, className)}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </Badge>
  );
}
