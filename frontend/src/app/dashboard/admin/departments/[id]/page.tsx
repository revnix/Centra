"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Crown, Plus, Users, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { attendanceApi, departmentsApi, employeesApi } from "@/lib/api";
import { useDepartments } from "@/lib/hooks/useDepartments";
import { useCreateEmployee, useEmployees } from "@/lib/hooks/useEmployees";

function hhmmssToHhmm(v: string | null | undefined): string {
  if (!v) return "";
  return String(v).slice(0, 5);
}

export default function DepartmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const departmentId = Number(params?.id);

  const { data: departments } = useDepartments();
  const { data: allEmployees, isLoading: employeesLoading } = useEmployees();

  const createEmployee = useCreateEmployee();

  const dept = useMemo(() => (departments ?? []).find((d) => d.id === departmentId), [departments, departmentId]);
  const deptEmployees = useMemo(
    () => (allEmployees ?? []).filter((e) => e.department_id === departmentId),
    [allEmployees, departmentId]
  );

  // Employees with no department assigned — show them so HR can assign
  const unassignedEmployees = useMemo(
    () => (allEmployees ?? []).filter((e) => e.department_id === null || e.department_id === undefined),
    [allEmployees]
  );

  const shiftsQ = useQuery({
    queryKey: ["attendance", "shifts"],
    queryFn: () => attendanceApi.listShifts(),
    staleTime: 10_000,
  });

  const shiftOptions = useMemo(() => shiftsQ.data ?? [], [shiftsQ.data]);

  const employeeProfileIdsKey = useMemo(
    () => deptEmployees.map((e) => e.employee_profile_id).sort((a, b) => a - b).join(","),
    [deptEmployees]
  );

  const employeeShiftsQ = useQuery({
    queryKey: ["attendance", "employeeShifts", employeeProfileIdsKey],
    queryFn: () =>
      attendanceApi.employeeShifts(
        employeeProfileIdsKey
          ? employeeProfileIdsKey.split(",").map((x) => Number(x))
          : []
      ),
    enabled: !!employeeProfileIdsKey,
    staleTime: 10_000,
  });

  const shiftByEmployee = useMemo(() => {
    const m = new Map<number, any>();
    for (const s of employeeShiftsQ.data || []) {
      m.set(s.employee_profile_id, s.shift);
    }
    return m;
  }, [employeeShiftsQ.data]);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignEmployeeProfileId, setAssignEmployeeProfileId] = useState<number | null>(null);
  const [assignShiftId, setAssignShiftId] = useState<string>("");
  const [effectiveFrom, setEffectiveFrom] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [assignBusy, setAssignBusy] = useState(false);

  const [leadUserId, setLeadUserId] = useState<string>("");
  const [savingLead, setSavingLead] = useState(false);

  const [openAdd, setOpenAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [joiningDate, setJoiningDate] = useState("");

  if (!departmentId || Number.isNaN(departmentId)) {
    return <div className="text-sm text-muted-foreground">Invalid department.</div>;
  }

  const openAssign = (employeeProfileId: number) => {
    setAssignEmployeeProfileId(employeeProfileId);
    setAssignShiftId("");
    setAssignOpen(true);
  };

  const onAssignShift = async () => {
    if (!assignEmployeeProfileId) return;
    if (!assignShiftId) {
      toast.error("Shift is required");
      return;
    }
    if (!effectiveFrom) {
      toast.error("Effective from date is required");
      return;
    }

    setAssignBusy(true);
    try {
      await attendanceApi.assignShift(assignEmployeeProfileId, {
        shift_id: Number(assignShiftId),
        effective_from: effectiveFrom,
      });
      toast.success("Shift assigned");
      setAssignOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to assign shift");
    } finally {
      setAssignBusy(false);
    }
  };

  const onSaveLead = async () => {
    const next = leadUserId ? Number(leadUserId) : null;
    setSavingLead(true);
    try {
      await departmentsApi.update(departmentId, { lead_user_id: next });
      toast.success("Department lead updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update lead");
    } finally {
      setSavingLead(false);
    }
  };

  const onAddEmployee = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error("Email is required");
      return;
    }

    try {
      const res = await createEmployee.mutateAsync({
        email: cleanEmail,
        full_name: fullName.trim() ? fullName.trim() : null,
        username: username.trim() ? username.trim() : null,
        password: password.trim() ? password.trim() : null,
        department_id: departmentId,
        job_title: jobTitle.trim() ? jobTitle.trim() : null,
        joining_date: joiningDate ? joiningDate : null,
        manager_user_id: null,
      });

      toast.success("Employee added to department");
      if (res?.temp_password) {
        toast.message("Temporary password generated", {
          description: res.temp_password,
        });
      }

      setEmail("");
      setFullName("");
      setUsername("");
      setPassword("");
      setJobTitle("");
      setJoiningDate("");
      setOpenAdd(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to add employee");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Button variant="ghost" className="gap-2 px-2" onClick={() => router.push("/dashboard/admin/departments")}> 
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="mt-2">
            <h1 className="text-xl font-semibold truncate">{dept?.name || "Department"}</h1>
            <p className="text-sm text-muted-foreground">{dept?.description || "—"}</p>
          </div>
        </div>

        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add employee</DialogTitle>
              <DialogDescription>
                Employee will be added to this department. Leave password empty to generate a temporary password.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emp-email">Work email</Label>
                <Input id="emp-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emp-name">Full name</Label>
                  <Input id="emp-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp-username">Username</Label>
                  <Input id="emp-username" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emp-password">Password (optional)</Label>
                <Input id="emp-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave empty for temporary password" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emp-title">Job title</Label>
                  <Input id="emp-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp-joining">Joining date</Label>
                  <Input id="emp-joining" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenAdd(false)}>
                  Cancel
                </Button>
                <Button onClick={onAddEmployee} disabled={createEmployee.isPending}>
                  {createEmployee.isPending ? "Adding…" : "Add"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Department lead</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Lead employee</Label>
              <Select value={leadUserId} onValueChange={setLeadUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lead" />
                </SelectTrigger>
                <SelectContent>
                  {deptEmployees.map((e) => (
                    <SelectItem key={e.user_id} value={String(e.user_id)}>
                      {e.full_name || e.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Only employees in this department are shown.</p>
            </div>

            <div className="flex items-end">
              <Button onClick={onSaveLead} disabled={savingLead} className="gap-2">
                <Crown className="h-4 w-4" />
                {savingLead ? "Saving…" : "Save lead"}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="text-sm text-muted-foreground">
            Current lead user id: <span className="text-foreground">{String(dept?.lead_user_id ?? "—")}</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign shift</DialogTitle>
            <DialogDescription>
              Assign a shift so the employee can punch attendance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Shift</Label>
              <Select value={assignShiftId} onValueChange={setAssignShiftId}>
                <SelectTrigger>
                  <SelectValue placeholder={shiftsQ.isLoading ? "Loading…" : "Select shift"} />
                </SelectTrigger>
                <SelectContent>
                  {shiftOptions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {shiftOptions.length === 0 && !shiftsQ.isLoading && (
                <div className="text-xs text-muted-foreground">No shifts yet. Create one in Shifts.</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="effective-from">Effective from</Label>
              <Input
                id="effective-from"
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignOpen(false)}>
                Cancel
              </Button>
              <Button onClick={onAssignShift} disabled={assignBusy}>
                {assignBusy ? "Assigning…" : "Assign"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employeesLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : deptEmployees.length === 0 && unassignedEmployees.length === 0 ? (
            <div className="text-sm text-muted-foreground">No employees in this department yet.</div>
          ) : (
            <>
              {unassignedEmployees.length > 0 && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-bold text-amber-700 mb-2">⚠️ Unassigned Employees ({unassignedEmployees.length}) — not linked to any department</p>
                  <div className="space-y-1">
                    {unassignedEmployees.map((e) => (
                      <div key={e.employee_profile_id} className="flex items-center justify-between text-xs p-2 bg-white rounded border border-amber-100">
                        <span className="font-medium text-slate-700">{e.full_name || e.email} <span className="text-slate-400 ml-1">({e.job_title || 'No title'})</span></span>
                        <button
                          className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold"
                          onClick={async () => {
                            try {
                              await employeesApi.update(e.employee_profile_id, { department_id: departmentId });
                              toast.success(`${e.full_name || e.email} assigned to this department`);
                              window.location.reload();
                            } catch {
                              toast.error('Failed to assign employee');
                            }
                          }}
                        >
                          Assign here
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Joining date</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead className="w-[90px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deptEmployees.map((e) => (
                  <TableRow key={e.employee_profile_id}>
                    <TableCell className="font-medium">{e.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{e.email}</TableCell>
                    <TableCell className="text-muted-foreground">{e.job_title || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{e.joining_date || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {(() => {
                        const s = shiftByEmployee.get(e.employee_profile_id);
                        if (!s) return "—";
                        const start = hhmmssToHhmm(s.start_time);
                        const end = hhmmssToHhmm(s.end_time);
                        return `${s.name}${start && end ? ` (${start}–${end})` : ""}`;
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openAssign(e.employee_profile_id)}
                        aria-label="Assign shift"
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
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
