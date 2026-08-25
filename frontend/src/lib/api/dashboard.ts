import { apiClient } from "./client";

export type DashboardTimeseriesPoint = {
  day: string; // YYYY-MM-DD
  value: number;
};

export type DashboardSummary = {
  role: string;
  is_lead: boolean;
  range: string;
  employee?: {
    attendance_today: null | {
      work_date: string;
      status: string | null;
      check_in_at: string | null;
      check_out_at: string | null;
      late_minutes: number;
      break_minutes: number;
      overtime_minutes: number;
    };
    worked_minutes_14d: DashboardTimeseriesPoint[];
    late_minutes_14d: DashboardTimeseriesPoint[];
  } | null;
  lead?: {
    team_today: {
      total_members: number;
      checked_in: number;
      checked_out: number;
      not_checked_in: number;
    };
    team_late_today: number;
  } | null;
  hr_admin?: {
    employees_total: number;
    departments_total: number;
    jobs_total: number;
    applications_total: number;
  } | null;
};

export const dashboardApi = {
  summary: (range: "today" | "7d" | "14d" | "30d" = "14d") =>
    apiClient.get<DashboardSummary>("/dashboard/summary", { params: { range } }),
};
