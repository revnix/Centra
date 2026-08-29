"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Users2, KeyRound, Copy, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useDepartments } from "@/lib/hooks/useDepartments";
import { useCreateEmployee, useEmployees } from "@/lib/hooks/useEmployees";
import { attendanceApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

function copyToClipboard(value: string) {
  if (!value) return;
  navigator.clipboard.writeText(value).catch(() => {
    // ignore
  });
}

function todayYmd(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function EmployeesPage() {
  const { data: departments } = useDepartments();
  const { data: employees, isLoading, error } = useEmployees();
  const createEmployee = useCreateEmployee();

  const shiftsQ = useQuery({
    queryKey: ["attendance", "shifts"],
    queryFn: () => attendanceApi.listShifts(),
    staleTime: 10_000,
  });

  const [open, setOpen] = useState(false);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [jobTitle, setJobTitle] = useState("");
  const [joiningDate, setJoiningDate] = useState("");

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignEmployeeProfileId, setAssignEmployeeProfileId] = useState<number | null>(null);
  const [assignShiftId, setAssignShiftId] = useState<string>("");
  const [effectiveFrom, setEffectiveFrom] = useState(todayYmd());
  const [assignBusy, setAssignBusy] = useState(false);

  const deptOptions = useMemo(() => departments ?? [], [departments]);
  const rows = useMemo(() => employees ?? [], [employees]);
  const shiftOptions = useMemo(() => shiftsQ.data ?? [], [shiftsQ.data]);

  const onCreate = async () => {
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
        password: password.trim() ? password.trim() : null, // if null -> invite-style temp_password
        department_id: departmentId ? Number(departmentId) : null,
        job_title: jobTitle.trim() ? jobTitle.trim() : null,
        joining_date: joiningDate ? joiningDate : null,
        manager_user_id: null,
      });

      toast.success("Employee created");

      if (res?.temp_password) {
        toast.message("Temporary password generated", {
          description: "Click to copy",
          action: {
            label: "Copy",
            onClick: () => copyToClipboard(res.temp_password as string),
          },
        });
      }

      setEmail("");
      setFullName("");
      setUsername("");
      setPassword("");
      setDepartmentId("");
      setJobTitle("");
      setJoiningDate("");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create employee");
    }
  };

  const openAssign = (employeeProfileId: number) => {
    setAssignEmployeeProfileId(employeeProfileId);
    setAssignShiftId("");
    setEffectiveFrom(todayYmd());
    setAssignOpen(true);
  };

  const onAssign = async () => {
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Users2 className="h-5 w-5" />
            <h1 className="text-xl font-semibold">Employees</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            HR/Admin can create employee accounts and assign them to departments.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add employee</DialogTitle>
              <DialogDescription>
                Leave password empty to generate a temporary password (invite-style).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emp-email">Work email</Label>
                <Input
                  id="emp-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emp-name">Full name</Label>
                  <Input
                    id="emp-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Employee name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp-username">Username</Label>
                  <Input
                    id="emp-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="employee1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emp-password" className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" /> Password (optional)
                </Label>
                <Input
                  id="emp-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty for temporary password"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={departmentId} onValueChange={setDepartmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {deptOptions.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emp-title">Job title</Label>
                  <Input
                    id="emp-title"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Web Developer"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emp-joining">Joining date</Label>
                <Input
                  id="emp-joining"
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={onCreate} disabled={createEmployee.isPending}>
                  {createEmployee.isPending ? "Creating…" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign shift</DialogTitle>
            <DialogDescription>
              Employee needs a shift assignment before they can use attendance (IN/BREAK/BACK/OUT).
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
                <div className="text-xs text-muted-foreground">
                  No shifts yet. Create one in Shifts.
                </div>
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
              <Button onClick={onAssign} disabled={assignBusy}>
                {assignBusy ? "Assigning…" : "Assign"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employee directory</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : error ? (
            <div className="text-sm text-destructive">Failed to load employees</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No employees yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-[150px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => {
                  const deptName =
                    deptOptions.find((d) => d.id === e.department_id)?.name || "—";
                  return (
                    <TableRow key={e.employee_profile_id}>
                      <TableCell className="font-medium">{e.full_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{e.email}</TableCell>
                      <TableCell className="text-muted-foreground">{deptName}</TableCell>
                      <TableCell className="text-muted-foreground">{e.role}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              copyToClipboard(e.email);
                              toast.success("Copied");
                            }}
                            aria-label="Copy email"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openAssign(e.employee_profile_id)}
                            aria-label="Assign shift"
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
