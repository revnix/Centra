"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { WorkedMinutesChart, LateMinutesChart } from "@/components/dashboard/attendance-charts";

export function EmployeeDashboard({
  summary,
}: {
  summary: {
    attendance_today: null | {
      work_date: string;
      status: string | null;
      check_in_at: string | null;
      check_out_at: string | null;
      late_minutes: number;
      break_minutes: number;
      overtime_minutes: number;
    };
    worked_minutes_14d: Array<{ day: string; value: number }>;
    late_minutes_14d: Array<{ day: string; value: number }>;
  };
}) {
  const today = summary.attendance_today;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="Status" value={today?.status || "—"} subtitle={today?.work_date || "Today"} />
        <StatCard title="Late (min)" value={today?.late_minutes ?? 0} />
        <StatCard title="Break (min)" value={today?.break_minutes ?? 0} />
        <StatCard title="Overtime (min)" value={today?.overtime_minutes ?? 0} />
      </div>

      {!today ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No attendance record yet for today. Use the Attendance page to punch In/Out.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WorkedMinutesChart data={summary.worked_minutes_14d} />
        <LateMinutesChart data={summary.late_minutes_14d} />
      </div>
    </div>
  );
}
