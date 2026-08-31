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

export type AttendanceSessionWithEmployee = AttendanceSession & {
  full_name: string | null;
  department_name: string | null;
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

export type CorrectionAction = "IN" | "OUT" | "BREAK" | "BACK";

export type CorrectionRequestCreate = {
  work_date: string; // YYYY-MM-DD
  action: CorrectionAction;
  requested_time: string; // ISO datetime
  reason?: string | null;
};

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export type LeaveRequestCreate = {
  start_date: string; // YYYY-MM-DD
  end_date: string;
  reason?: string | null;
};

export type LeaveRequest = {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: LeaveStatus;
  approved_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  full_name: string | null;
};

export type PublicHolidayCreate = {
  date: string; // YYYY-MM-DD
  name: string;
};

export type PublicHoliday = {
  id: number;
  date: string;
  name: string;
};

export type MonthlySummary = {
  user_id: number;
  year: number;
  month: number;
  working_days: number;
  actual_hours: number;
  total_hours: number;
  difference: number;
  days_present: number;
  days_on_leave: number;
};

export type UnassignedEmployee = {
  employee_profile_id: number;
  user_id: number;
  full_name: string | null;
  email: string;
};

export type BulkAssignResult = {
  ok: boolean;
  created: number;
  skipped: number;
};

export type Correction = {
  id: number;
  user_id: number;
  work_date: string;
  action: CorrectionAction;
  requested_time: string;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  full_name: string | null;
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
    apiClient.post<{ ok: true }>(`/attendance/employees/${employeeProfileId}/shift`, payload),

  employeeShifts: (employeeProfileIds: number[], asOf?: string) =>
    apiClient.get<EmployeeShift[]>("/attendance/employee-shifts", {
      params: {
        employee_profile_ids: employeeProfileIds.join(","),
        ...(asOf ? { as_of: asOf } : {}),
      },
    }),

  // admin/hr — company-wide view (Phase 1)
  sessions: (params: {
    fromDate: string;
    toDate: string;
    departmentId?: number;
    userId?: number;
  }) =>
    apiClient.get<AttendanceSessionWithEmployee[]>("/attendance/sessions", {
      params: {
        from_date: params.fromDate,
        to_date: params.toDate,
        ...(params.departmentId ? { department_id: params.departmentId } : {}),
        ...(params.userId ? { user_id: params.userId } : {}),
      },
    }),

  // corrections (Phase 2)
  requestCorrection: (payload: CorrectionRequestCreate) =>
    apiClient.post<Correction>("/attendance/corrections", payload),

  listCorrections: (status?: string) =>
    apiClient.get<Correction[]>("/attendance/corrections", {
      params: status ? { status } : {},
    }),

  approveCorrection: (id: number) =>
    apiClient.post<Correction>(`/attendance/corrections/${id}/approve`),

  rejectCorrection: (id: number) =>
    apiClient.post<Correction>(`/attendance/corrections/${id}/reject`),

  // leave & holidays (Phase 3)
  requestLeave: (payload: LeaveRequestCreate) =>
    apiClient.post<LeaveRequest>("/attendance/leave", payload),

  myLeaveRequests: () => apiClient.get<LeaveRequest[]>("/attendance/leave/me"),

  listLeaveRequests: (status?: string) =>
    apiClient.get<LeaveRequest[]>("/attendance/leave", {
      params: status ? { status } : {},
    }),

  approveLeave: (id: number) => apiClient.post<LeaveRequest>(`/attendance/leave/${id}/approve`),
  rejectLeave: (id: number) => apiClient.post<LeaveRequest>(`/attendance/leave/${id}/reject`),

  listHolidays: () => apiClient.get<PublicHoliday[]>("/attendance/holidays"),
  createHoliday: (payload: PublicHolidayCreate) =>
    apiClient.post<PublicHoliday>("/attendance/holidays", payload),

  // monthly summary (Phase 4)
  monthlySummary: (year: number, month: number, userId?: number) =>
    apiClient.get<MonthlySummary>("/attendance/summary", {
      params: { year, month, ...(userId ? { user_id: userId } : {}) },
    }),

  // rollout helpers (Phase 7)
  bulkAssignShift: (shiftId: number, employeeProfileIds: number[], effectiveFrom: string) =>
    apiClient.post<BulkAssignResult>(`/attendance/shifts/${shiftId}/assign-bulk`, {
      employee_profile_ids: employeeProfileIds,
      effective_from: effectiveFrom,
    }),

  unassignedEmployees: () =>
    apiClient.get<UnassignedEmployee[]>("/attendance/unassigned-employees"),
};
