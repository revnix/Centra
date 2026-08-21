"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, CheckSquare } from "lucide-react";

import { attendanceApi, type ShiftTemplate } from "@/lib/api";

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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  const rows: ShiftTemplate[] = useMemo(() => shiftsQ.data ?? [], [shiftsQ.data]);

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
    </div>
  );
}
