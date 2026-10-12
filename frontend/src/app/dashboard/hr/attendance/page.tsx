"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { Users } from "lucide-react";

import {
  attendanceApi,
  departmentsApi,
  employeesApi,
  type Correction,
  type LeaveRequest,
  type PublicHoliday,
} from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function toYmd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function fmtTs(ts: string | null): string {
  if (!ts) return "—";
  const dt = new Date(ts);
  if (Number.isNaN(dt.getTime())) return ts;
  return format(dt, "PP p");
}

const ALL_DEPARTMENTS = "all";

export default function HrAttendancePage() {
  const qc = useQueryClient();
  const today = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => subDays(today, 14), [today]);

  const [fromDate, setFromDate] = useState(toYmd(defaultFrom));
  const [toDate, setToDate] = useState(toYmd(today));
  const [departmentId, setDepartmentId] = useState<string>(ALL_DEPARTMENTS);

  const departmentsQ = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentsApi.list(),
    staleTime: 60_000,
  });

  const employeesQ = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.list(),
    staleTime: 60_000,
  });

  const sessionsQ = useQuery({
    queryKey: ["attendance", "sessions", fromDate, toDate, departmentId],
    queryFn: () =>
      attendanceApi.sessions({
        fromDate,
        toDate,
        departmentId: departmentId === ALL_DEPARTMENTS ? undefined : Number(departmentId),
      }),
    staleTime: 10_000,
  });

  const rows = sessionsQ.data ?? [];

  const correctionsQ = useQuery({
    queryKey: ["attendance", "corrections", "PENDING"],
    queryFn: () => attendanceApi.listCorrections("PENDING"),
    staleTime: 5_000,
  });
  const corrections: Correction[] = correctionsQ.data ?? [];

  const invalidateCorrections = () =>
    qc.invalidateQueries({ queryKey: ["attendance", "corrections"] });

  const approveM = useMutation({
    mutationFn: (id: number) => attendanceApi.approveCorrection(id),
    onSuccess: async () => {
      toast.success("Correction approved");
      await invalidateCorrections();
      await qc.invalidateQueries({ queryKey: ["attendance", "sessions"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to approve"),
  });

  const rejectM = useMutation({
    mutationFn: (id: number) => attendanceApi.rejectCorrection(id),
    onSuccess: async () => {
      toast.success("Correction rejected");
      await invalidateCorrections();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to reject"),
  });

  // --- Leave requests ---
  const leaveQ = useQuery({
    queryKey: ["attendance", "leave", "PENDING"],
    queryFn: () => attendanceApi.listLeaveRequests("PENDING"),
    staleTime: 5_000,
  });
  const leaveRequests: LeaveRequest[] = leaveQ.data ?? [];

  const approveLeaveM = useMutation({
    mutationFn: (id: number) => attendanceApi.approveLeave(id),
    onSuccess: async () => {
      toast.success("Leave approved");
      await qc.invalidateQueries({ queryKey: ["attendance", "leave"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to approve"),
  });

  const rejectLeaveM = useMutation({
    mutationFn: (id: number) => attendanceApi.rejectLeave(id),
    onSuccess: async () => {
      toast.success("Leave rejected");
      await qc.invalidateQueries({ queryKey: ["attendance", "leave"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to reject"),
  });

  // --- Public holidays ---
  const holidaysQ = useQuery({
    queryKey: ["attendance", "holidays"],
    queryFn: () => attendanceApi.listHolidays(),
    staleTime: 30_000,
  });
  const holidays: PublicHoliday[] = holidaysQ.data ?? [];

  const [holidayOpen, setHolidayOpen] = useState(false);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");

  const addHolidayM = useMutation({
    mutationFn: () => attendanceApi.createHoliday({ date: holidayDate, name: holidayName.trim() }),
    onSuccess: async () => {
      toast.success("Holiday added");
      setHolidayOpen(false);
      setHolidayDate("");
      setHolidayName("");
      await qc.invalidateQueries({ queryKey: ["attendance", "holidays"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to add holiday"),
  });

  // --- Per-employee monthly summary (Phase 4) ---
  const [summaryUserId, setSummaryUserId] = useState<string>("");
  const [summaryYear, setSummaryYear] = useState(today.getFullYear());
  const [summaryMonth, setSummaryMonth] = useState(today.getMonth() + 1);

  const summaryQ = useQuery({
    queryKey: ["attendance", "summary", summaryUserId, summaryYear, summaryMonth],
    queryFn: () => attendanceApi.monthlySummary(summaryYear, summaryMonth, Number(summaryUserId)),
    enabled: !!summaryUserId,
    staleTime: 10_000,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Attendance — All Employees</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Company-wide attendance. Filter by date range and department.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="from-date">From</Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-date">To</Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_DEPARTMENTS}>All departments</SelectItem>
                  {(departmentsQ.data ?? []).map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Sessions ({fromDate} – {toDate})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessionsQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : sessionsQ.error ? (
            <div className="text-sm text-destructive">
              {(sessionsQ.error as any)?.message || "Failed to load attendance"}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No attendance recorded for this range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>In</TableHead>
                    <TableHead>Out</TableHead>
                    <TableHead>Late</TableHead>
                    <TableHead>Break</TableHead>
                    <TableHead>OT</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.full_name || `User #${s.user_id}`}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.department_name || "—"}
                      </TableCell>
                      <TableCell>{s.work_date}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtTs(s.check_in_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtTs(s.check_out_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{s.late_minutes}m</TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.total_break_minutes}m
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.overtime_minutes}m
                      </TableCell>
                      <TableCell className="text-muted-foreground">{s.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={summaryUserId} onValueChange={setSummaryUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {(employeesQ.data ?? []).map((e) => (
                    <SelectItem key={e.user_id} value={String(e.user_id)}>
                      {e.full_name || e.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary-year">Year</Label>
              <Input
                id="summary-year"
                type="number"
                value={summaryYear}
                onChange={(e) => setSummaryYear(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary-month">Month</Label>
              <Input
                id="summary-month"
                type="number"
                min={1}
                max={12}
                value={summaryMonth}
                onChange={(e) => setSummaryMonth(Number(e.target.value))}
              />
            </div>
          </div>

          {!summaryUserId ? (
            <div className="text-sm text-muted-foreground">Pick an employee to see their summary.</div>
          ) : summaryQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : summaryQ.error ? (
            <div className="text-sm text-destructive">
              {(summaryQ.error as any)?.message || "Failed to load summary"}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Working days</div>
                <div className="mt-1 text-sm font-medium">{summaryQ.data?.working_days}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Days present</div>
                <div className="mt-1 text-sm font-medium">{summaryQ.data?.days_present}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Days on leave</div>
                <div className="mt-1 text-sm font-medium">{summaryQ.data?.days_on_leave}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Actual hours</div>
                <div className="mt-1 text-sm font-medium">{summaryQ.data?.actual_hours}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Expected hours</div>
                <div className="mt-1 text-sm font-medium">{summaryQ.data?.total_hours}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Difference</div>
                <div className="mt-1 text-sm font-medium">{summaryQ.data?.difference}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Pending Corrections
            {corrections.length > 0 ? (
              <Badge variant="secondary" className="ml-2">
                {corrections.length}
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {correctionsQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : corrections.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nothing pending.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Requested time</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {corrections.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {c.full_name || `User #${c.user_id}`}
                      </TableCell>
                      <TableCell>{c.work_date}</TableCell>
                      <TableCell>{c.action}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtTs(c.requested_time)}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-muted-foreground">
                        {c.reason || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={rejectM.isPending || approveM.isPending}
                            onClick={() => rejectM.mutate(c.id)}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            disabled={approveM.isPending || rejectM.isPending}
                            onClick={() => approveM.mutate(c.id)}
                          >
                            Approve
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Pending Leave Requests
            {leaveRequests.length > 0 ? (
              <Badge variant="secondary" className="ml-2">
                {leaveRequests.length}
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaveQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : leaveRequests.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nothing pending.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">
                        {l.full_name || `User #${l.user_id}`}
                      </TableCell>
                      <TableCell>{l.start_date}</TableCell>
                      <TableCell>{l.end_date}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-muted-foreground">
                        {l.reason || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={rejectLeaveM.isPending || approveLeaveM.isPending}
                            onClick={() => rejectLeaveM.mutate(l.id)}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            disabled={approveLeaveM.isPending || rejectLeaveM.isPending}
                            onClick={() => approveLeaveM.mutate(l.id)}
                          >
                            Approve
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Public Holidays</CardTitle>
            <Dialog open={holidayOpen} onOpenChange={setHolidayOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  Add holiday
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add public holiday</DialogTitle>
                  <DialogDescription>Applies company-wide.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="holiday-date">Date</Label>
                    <Input
                      id="holiday-date"
                      type="date"
                      value={holidayDate}
                      onChange={(e) => setHolidayDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="holiday-name">Name</Label>
                    <Input
                      id="holiday-name"
                      value={holidayName}
                      onChange={(e) => setHolidayName(e.target.value)}
                      placeholder="Independence Day"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setHolidayOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => addHolidayM.mutate()}
                    disabled={addHolidayM.isPending || !holidayDate || !holidayName.trim()}
                  >
                    {addHolidayM.isPending ? "Adding…" : "Add"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {holidaysQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : holidays.length === 0 ? (
            <div className="text-sm text-muted-foreground">No holidays recorded yet.</div>
          ) : (
            <div className="divide-y rounded-lg border">
              {holidays.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="text-sm font-medium">{h.name}</div>
                  <div className="text-sm text-muted-foreground">{h.date}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
