"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, CheckSquare, Users, AlertTriangle } from "lucide-react";

import { attendanceApi, employeesApi, type ShiftTemplate, type UnassignedEmployee } from "@/lib/api";
import type { Employee } from "@/lib/api/employees";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function hhmmssToHhmm(v: string): string {
  if (!v) return "";
  // backend returns HH:MM:SS
  return v.slice(0, 5);
}

export default function ShiftsPage() {
  const qc = useQueryClient();

  const shiftsQ = useQuery({
    queryKey: ["attendance", "shifts"],
    queryFn: () => attendanceApi.listShifts(),
    staleTime: 10_000,
  });

  const employeesQ = useQuery({
    queryKey: ["hr", "employees"],
    queryFn: () => employeesApi.list(),
    staleTime: 30_000,
  });

  const unassignedQ = useQuery({
    queryKey: ["attendance", "unassigned-employees"],
    queryFn: () => attendanceApi.unassignedEmployees(),
    staleTime: 10_000,
  });

  const rows: ShiftTemplate[] = useMemo(() => shiftsQ.data ?? [], [shiftsQ.data]);
  const unassigned: UnassignedEmployee[] = useMemo(() => unassignedQ.data ?? [], [unassignedQ.data]);

  // ---------- Create shift dialog ----------
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [graceMinutes, setGraceMinutes] = useState("10");
  const [breakAllowed, setBreakAllowed] = useState(true);
  const [breakMaxMinutes, setBreakMaxMinutes] = useState("60");

  const createM = useMutation({
    mutationFn: () =>
      attendanceApi.createShift({
        name: name.trim(),
        start_time: startTime,
        end_time: endTime,
        grace_minutes: Number.isFinite(Number(graceMinutes)) ? Number(graceMinutes) : 0,
        break_allowed: breakAllowed,
        break_max_minutes:
          breakAllowed && breakMaxMinutes.trim() !== "" ? Number(breakMaxMinutes) : null,
      }),
    onSuccess: async () => {
      toast.success("Shift created");
      await qc.invalidateQueries({ queryKey: ["attendance", "shifts"] });
      setOpen(false);
      setName("");
      setStartTime("09:00");
      setEndTime("18:00");
      setGraceMinutes("10");
      setBreakAllowed(true);
      setBreakMaxMinutes("60");
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to create shift");
    },
  });

  // ---------- Bulk assign dialog ----------
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkShiftId, setBulkShiftId] = useState<string>("");
  const [bulkEffectiveFrom, setBulkEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedEmployees, setSelectedEmployees] = useState<Set<number>>(new Set());

  const allEmployees: Employee[] = useMemo(() => employeesQ.data ?? [], [employeesQ.data]);

  const toggleEmployee = (profileId: number) => {
    setSelectedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedEmployees.size === allEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(allEmployees.map((e) => e.employee_profile_id)));
    }
  };

  const bulkAssignM = useMutation({
    mutationFn: () =>
      attendanceApi.bulkAssignShift(
        Number(bulkShiftId),
        Array.from(selectedEmployees),
        bulkEffectiveFrom
      ),
    onSuccess: async (result) => {
      toast.success(
        `Assigned: ${result.created} employee(s)${result.skipped ? `, ${result.skipped} already assigned` : ""}`
      );
      await qc.invalidateQueries({ queryKey: ["attendance"] });
      setBulkOpen(false);
      setSelectedEmployees(new Set());
      setBulkShiftId("");
    },
    onError: (e: any) => {
      toast.error(e?.message || "Bulk assign failed");
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            <h1 className="text-xl font-semibold">Shifts</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Create shift templates (start/end, grace, break rules). Employees can then be assigned a
            shift.
          </p>
        </div>

        <div className="flex gap-2">
          {/* Bulk Assign button */}
          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                Bulk Assign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bulk Assign Shift</DialogTitle>
                <DialogDescription>
                  Select employees and assign them all to a single shift template at once.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Shift picker */}
                <div className="space-y-2">
                  <Label>Shift template</Label>
                  <Select value={bulkShiftId} onValueChange={setBulkShiftId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a shift" />
                    </SelectTrigger>
                    <SelectContent>
                      {rows.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name} ({hhmmssToHhmm(s.start_time)} – {hhmmssToHhmm(s.end_time)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Effective date */}
                <div className="space-y-2">
                  <Label htmlFor="bulk-effective-from">Effective from</Label>
                  <Input
                    id="bulk-effective-from"
                    type="date"
                    value={bulkEffectiveFrom}
                    onChange={(e) => setBulkEffectiveFrom(e.target.value)}
                  />
                </div>

                {/* Employee list with checkboxes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>
                      Employees ({selectedEmployees.size} / {allEmployees.length} selected)
                    </Label>
                    <Button variant="ghost" size="sm" onClick={toggleAll}>
                      {selectedEmployees.size === allEmployees.length
                        ? "Deselect all"
                        : "Select all"}
                    </Button>
                  </div>

                  {employeesQ.isLoading ? (
                    <div className="text-sm text-muted-foreground py-2">Loading employees…</div>
                  ) : allEmployees.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-2">
                      No employees found. Create employee profiles first.
                    </div>
                  ) : (
                    <div className="max-h-52 overflow-y-auto rounded-md border p-2 space-y-1">
                      {allEmployees.map((emp) => (
                        <label
                          key={emp.employee_profile_id}
                          className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={selectedEmployees.has(emp.employee_profile_id)}
                            onCheckedChange={() => toggleEmployee(emp.employee_profile_id)}
                          />
                          <span className="font-medium">
                            {emp.full_name || emp.username || emp.email}
                          </span>
                          <span className="text-muted-foreground ml-auto text-xs truncate">
                            {emp.email}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => setBulkOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => bulkAssignM.mutate()}
                    disabled={
                      bulkAssignM.isPending ||
                      !bulkShiftId ||
                      selectedEmployees.size === 0
                    }
                  >
                    {bulkAssignM.isPending
                      ? "Assigning…"
                      : `Assign ${selectedEmployees.size} employee(s)`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Create Shift button */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Shift
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create shift</DialogTitle>
                <DialogDescription>
                  Times are stored as templates; employees pick/are assigned a shift.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shift-name">Name</Label>
                  <Input
                    id="shift-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Morning Shift"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="shift-start">Start time</Label>
                    <Input
                      id="shift-start"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shift-end">End time</Label>
                    <Input
                      id="shift-end"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shift-grace">Grace minutes</Label>
                  <Input
                    id="shift-grace"
                    inputMode="numeric"
                    value={graceMinutes}
                    onChange={(e) => setGraceMinutes(e.target.value)}
                    placeholder="10"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Break allowed</div>
                    <div className="text-xs text-muted-foreground">
                      If disabled, employees cannot start breaks.
                    </div>
                  </div>
                  <Switch checked={breakAllowed} onCheckedChange={setBreakAllowed} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shift-break-max">Max break minutes (optional)</Label>
                  <Input
                    id="shift-break-max"
                    inputMode="numeric"
                    value={breakMaxMinutes}
                    onChange={(e) => setBreakMaxMinutes(e.target.value)}
                    placeholder="60"
                    disabled={!breakAllowed}
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => createM.mutate()} disabled={createM.isPending || !name.trim()}>
                    {createM.isPending ? "Creating…" : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* All shifts table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All shifts</CardTitle>
        </CardHeader>
        <CardContent>
          {shiftsQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : shiftsQ.error ? (
            <div className="text-sm text-destructive">
              {(shiftsQ.error as any)?.message || "Failed to load shifts"}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No shift templates yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Grace</TableHead>
                  <TableHead>Break</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {hhmmssToHhmm(s.start_time)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {hhmmssToHhmm(s.end_time)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.grace_minutes}m</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.break_allowed
                        ? `Yes${s.break_max_minutes ? ` (max ${s.break_max_minutes}m)` : ""}`
                        : "No"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Unassigned employees rollout checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {unassigned.length > 0 && (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
            <CardTitle className="text-base">Rollout Checklist — Unassigned Employees</CardTitle>
          </div>
          <CardDescription>
            Employees with a profile but no shift assignment — their &quot;In&quot; button won&apos;t work
            until they are assigned a shift.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unassignedQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : unassignedQ.error ? (
            <div className="text-sm text-destructive">
              {(unassignedQ.error as any)?.message || "Failed to load"}
            </div>
          ) : unassigned.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckSquare className="h-4 w-4" />
              All employees have shift assignments. Ready to go live!
            </div>
          ) : (
            <>
              <div className="mb-3">
                <Badge variant="secondary">
                  {unassigned.length} employee{unassigned.length !== 1 ? "s" : ""} without a shift
                </Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Profile ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unassigned.map((emp) => (
                    <TableRow key={emp.employee_profile_id}>
                      <TableCell className="font-medium">
                        {emp.full_name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {emp.employee_profile_id}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
