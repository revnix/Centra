"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { dashboardApi } from "@/lib/api";
import { useMe } from "@/lib/hooks/useMe";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import { LeadDashboard } from "@/components/dashboard/lead-dashboard";
import { HrAdminDashboard } from "@/components/dashboard/hr-admin-dashboard";

export default function DashboardHome() {
  const { data: me, isLoading: meLoading } = useMe();
  const role = useMemo(() => String(me?.role || "").toLowerCase(), [me?.role]);

  const [range, setRange] = useState<"today" | "7d" | "14d" | "30d">("14d");

  const summaryQ = useQuery({
    queryKey: ["dashboard", "summary", range],
    queryFn: () => dashboardApi.summary(range),
    enabled: !!role,
    staleTime: 10_000,
  });

  if (meLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!me) return <div className="text-sm text-destructive">Not logged in</div>;

  const isCandidate = role === "candidate";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {role === "employee"
              ? "Your day and attendance overview."
              : role === "hr"
              ? "Workforce and hiring overview."
              : role === "admin"
              ? "Organization overview."
              : role === "reviewer"
              ? "Review queue overview."
              : isCandidate
              ? "Your applications and onboarding."
              : "Overview."}
          </p>
        </div>

        <Tabs value={range} onValueChange={(v) => setRange(v as any)}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="7d">7d</TabsTrigger>
            <TabsTrigger value="14d">14d</TabsTrigger>
            <TabsTrigger value="30d">30d</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {summaryQ.isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Loading</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Fetching dashboard…</CardContent>
        </Card>
      ) : summaryQ.error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-destructive">
            {(summaryQ.error as any)?.message || "Failed to load"}
          </CardContent>
        </Card>
      ) : !summaryQ.data ? null : (
        <>
          {/* Employee + Lead */}
          {(role === "employee" || role === "hr" || role === "admin") && summaryQ.data.employee ? (
            <EmployeeDashboard summary={summaryQ.data.employee} />
          ) : null}

          {summaryQ.data.is_lead && summaryQ.data.lead ? (
            <LeadDashboard summary={summaryQ.data.lead} />
          ) : null}

          {(role === "hr" || role === "admin") && summaryQ.data.hr_admin ? (
            <HrAdminDashboard summary={summaryQ.data.hr_admin} />
          ) : null}

          {/* Candidate placeholder (next) */}
          {isCandidate ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Candidate overview</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Candidate dashboard widgets will be added next.
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
