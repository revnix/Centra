"use client";

import { StatCard } from "@/components/dashboard/stat-card";

export function LeadDashboard({
  summary,
}: {
  summary: {
    team_today: {
      total_members: number;
      checked_in: number;
      checked_out: number;
      not_checked_in: number;
    };
    team_late_today: number;
  };
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <StatCard title="Team members" value={summary.team_today.total_members} />
        <StatCard title="Checked in" value={summary.team_today.checked_in} />
        <StatCard title="On site (open)" value={Math.max(0, summary.team_today.checked_in - summary.team_today.checked_out)} />
        <StatCard title="Checked out" value={summary.team_today.checked_out} />
        <StatCard title="Not checked in" value={summary.team_today.not_checked_in} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatCard title="Late today" value={summary.team_late_today} subtitle="Members with late minutes > 0" />
      </div>
    </div>
  );
}
