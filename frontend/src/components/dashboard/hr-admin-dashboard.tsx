"use client";

import { StatCard } from "@/components/dashboard/stat-card";

export function HrAdminDashboard({
  summary,
}: {
  summary: {
    employees_total: number;
    departments_total: number;
    jobs_total: number;
    applications_total: number;
  };
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="Employees" value={summary.employees_total} />
        <StatCard title="Departments" value={summary.departments_total} />
        <StatCard title="Jobs" value={summary.jobs_total} />
        <StatCard title="Applications" value={summary.applications_total} />
      </div>
    </div>
  );
}
