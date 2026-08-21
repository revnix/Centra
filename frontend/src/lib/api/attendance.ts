import { apiClient } from "./client";

export type AttendanceSession = {
  id: number;
  user_id: number;
  work_date: string;
  shift_id: number | null;
  check_in_at: string | null;
  check_out_at: string | null;
  status: string;
  total_break_minutes: number;
  late_minutes: number;
  overtime_minutes: number;
  created_at: string;
  updated_at: string | null;
};

export type AttendanceActionResponse = {
  session: AttendanceSession;
};

export type ShiftTemplate = {
  id: number;
  name: string;
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  grace_minutes: number;
  break_allowed: boolean;
  break_max_minutes: number | null;
  created_at: string;
  updated_at: string | null;
};

export type ShiftTemplateCreate = {
  name: string;
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  grace_minutes?: number;
  break_allowed?: boolean;
  break_max_minutes?: number | null;
};

export type AssignShiftRequest = {
  shift_id: number;
  effective_from: string;// YYYY-MM-DD
};

export type EmployeeShift = {
  employee_profile_id: number;
  effective_from: string;
  shift: ShiftTemplate;
};

export const attendanceApi = {
  // employee actions
  in: () => apiClient.post<AttendanceActionResponse>("/attendance/in"),
  break: () => apiClient.post<AttendanceActionResponse>("/attendance/break"),
  back: () => apiClient.post<AttendanceActionResponse>("/attendance/back"),
  out: () => apiClient.post<AttendanceActionResponse>("/attendance/out"),

  me: (fromDate: string, toDate: string) =>
    apiClient.get<AttendanceSession[]>("/attendance/me", {
      params: { from_date: fromDate, to_date: toDate },
    }),

  // admin/hr
  listShifts: () => apiClient.get<ShiftTemplate[]>("/attendance/shifts"),
  createShift: (payload: ShiftTemplateCreate) =>
    apiClient.post<ShiftTemplate>("/attendance/shifts", payload),
  assignShift: (employeeProfileId: number, payload: AssignShiftRequest) =>
    apiClient.post<{ ok: true }>(`/attendance/employees//shift`, payload),

  employeeShifts: (employeeProfileIds: number[], asOf?: string) =>
    apiClient.get<EmployeeShift[]>("/attendance/employee-shifts", {
      params: {
        employee_profile_ids: employeeProfileIds.join(","),
        ...(asOf ? { as_of: asOf } : {}),
      },
    }),
};
