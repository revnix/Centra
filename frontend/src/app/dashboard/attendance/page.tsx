"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { toast } from "sonner";

import { attendanceApi, type AttendanceSession, type CorrectionAction } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { Textarea } from "@/components/ui/textarea";

// Matches the backend default (ATTENDANCE_BACKDATE_LIMIT_DAYS) — the
// server is the source of truth and will reject anything outside its own
// configured limit regardless of what this UI allows picking.
const BACKDATE_LIMIT_DAYS = 3;

function toYmd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function fmtTs(ts: string | null): string {
  if (!ts) return "—";
  const dt = new Date(ts);
  if (Number.isNaN(dt.getTime())) return ts;
  return format(dt, "PP p");
}

function friendlyAttendanceError(raw: unknown): string {
  const msg = (raw as any)?.message || String(raw || "");
  const m = String(msg || "").trim();

  if (!m) return "Something went wrong";
  if (m === "Already on break") return "You are already on break. Click Back to end your break.";
  if (m === "No active break") return "You are not on a break. Click Break to start one.";
  if (m === "Check-in required") return "You must check in first.";
  if (m === "Already checked out") return "You are already checked out.";
  if (m === "End break before check-out") return "End your break first (click Back), then check out.";
  if (m === "No shift assigned") return "No shift is assigned to you yet. Ask HR/Admin to assign a shift.";
  if (m === "You are on approved leave for this date") return "You're on approved leave today. Contact HR if this is a mistake.";
  if (m === "Cannot request a correction for a future date") return "You can't request a correction for a future date.";
  if (m.startsWith("Corrections can only be requested for the last")) return m + ".";

  return m;
}

export default function AttendancePage() {
  const qc = useQueryClient();
  const [lastMessage, setLastMessage] = useState<string>("");

  const today = useMemo(() => new Date(), []);
  const from = useMemo(() => subDays(today, 14), [today]);

  const fromDate = useMemo(() => toYmd(from), [from]);
  const toDate = useMemo(() => toYmd(today), [today]);

  const sessionsQ = useQuery({
    queryKey: ["attendance", "me", fromDate, toDate],
    queryFn: () => attendanceApi.me(fromDate, toDate),
    staleTime: 10_000,
  });

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const summaryQ = useQuery({
    queryKey: ["attendance", "summary", "me", currentYear, currentMonth],
    queryFn: () => attendanceApi.monthlySummary(currentYear, currentMonth),
    staleTime: 60_000,
  });

  const todaySession: AttendanceSession | undefined = useMemo(() => {
    const list = sessionsQ.data || [];
    return list.find((s) => s.work_date === toDate);
  }, [sessionsQ.data, toDate]);

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["attendance"] });
  };

  const makeAction = (label: string, fn: () => Promise<any>) =>
    useMutation({
      mutationFn: fn,
      onSuccess: async () => {
        setLastMessage("");
        await invalidate();
        toast.success(`${label} saved`);
      },
      onError: (e: any) => {
        const msg = friendlyAttendanceError(e);
        setLastMessage(msg);
        toast.error(msg);
      },
    });

  const inM = makeAction("Check-in", () => attendanceApi.in());
  const breakM = makeAction("Break", () => attendanceApi.break());
  const backM = makeAction("Back", () => attendanceApi.back());
  const outM = makeAction("Check-out", () => attendanceApi.out());

  const busy =
    sessionsQ.isFetching ||
    inM.isPending ||
    breakM.isPending ||
    backM.isPending ||
    outM.isPending;

  const canIn = !todaySession?.check_in_at;
  const canOut = !!todaySession?.check_in_at && !todaySession?.check_out_at;

  // --- Correction request dialog ---
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionDate, setCorrectionDate] = useState(toYmd(subDays(today, 1)));
  const [correctionAction, setCorrectionAction] = useState<CorrectionAction>("OUT");
  const [correctionTime, setCorrectionTime] = useState("17:30");
  const [correctionReason, setCorrectionReason] = useState("");

  const minCorrectionDate = toYmd(subDays(today, BACKDATE_LIMIT_DAYS));

  const correctionM = useMutation({
    mutationFn: () =>
      attendanceApi.requestCorrection({
        work_date: correctionDate,
        action: correctionAction,
        // datetime-local has no timezone; treat it as this browser's local time.
        requested_time: new Date(`${correctionDate}T${correctionTime}:00`).toISOString(),
        reason: correctionReason.trim() || null,
      }),
    onSuccess: async () => {
      toast.success("Correction request sent to HR");
      setCorrectionOpen(false);
      setCorrectionReason("");
      await invalidate();
    },
    onError: (e: any) => {
      toast.error(friendlyAttendanceError(e));
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Button disabled={busy || !canIn} onClick={() => inM.mutate()}>
              In
            </Button>
            <Button
              variant="outline"
              disabled={busy || !canOut}
              onClick={() => breakM.mutate()}
            >
              Break
            </Button>
            <Button
              variant="outline"
              disabled={busy || !canOut}
              onClick={() => backM.mutate()}
            >
              Back
            </Button>
            <Button
              variant="outline"
              disabled={busy || !canOut}
              onClick={() => outM.mutate()}
            >
              Out
            </Button>
          </div>

          {lastMessage ? (
            <div className="text-sm text-foreground">{lastMessage}</div>
          ) : null}

          <Separator />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Today</div>
              <div className="mt-1 text-sm font-medium">{toDate}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="mt-1 text-sm font-medium">
                {todaySession?.status || "—"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Check-in</div>
              <div className="mt-1 text-sm font-medium">
                {fmtTs(todaySession?.check_in_at || null)}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Check-out</div>
              <div className="mt-1 text-sm font-medium">
                {fmtTs(todaySession?.check_out_at || null)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Late (min)</div>
              <div className="mt-1 text-sm font-medium">
                {todaySession?.late_minutes ?? 0}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Break (min)</div>
              <div className="mt-1 text-sm font-medium">
                {todaySession?.total_break_minutes ?? 0}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Overtime (min)</div>
              <div className="mt-1 text-sm font-medium">
                {todaySession?.overtime_minutes ?? 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Monthly Summary — {format(today, "MMMM yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summaryQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : summaryQ.error ? (
            <div className="text-sm">{friendlyAttendanceError(summaryQ.error)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Working days</div>
                <div className="mt-1 text-sm font-medium">
                  {summaryQ.data?.working_days ?? "—"}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Days present</div>
                <div className="mt-1 text-sm font-medium">
                  {summaryQ.data?.days_present ?? "—"}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Days on leave</div>
                <div className="mt-1 text-sm font-medium">
                  {summaryQ.data?.days_on_leave ?? "—"}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Actual hours</div>
                <div className="mt-1 text-sm font-medium">
                  {summaryQ.data?.actual_hours ?? "—"}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Expected hours</div>
                <div className="mt-1 text-sm font-medium">
                  {summaryQ.data?.total_hours ?? "—"}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Difference</div>
                <div className="mt-1 text-sm font-medium">
                  {summaryQ.data?.difference ?? "—"}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last 14 days</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessionsQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : sessionsQ.error ? (
            <div className="text-sm">{friendlyAttendanceError(sessionsQ.error)}</div>
          ) : (sessionsQ.data || []).length === 0 ? (
            <div className="text-sm text-muted-foreground">No attendance yet.</div>
          ) : (
            <div className="divide-y rounded-lg border">
              {(sessionsQ.data || []).map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{s.work_date}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      In: {fmtTs(s.check_in_at)} · Out: {fmtTs(s.check_out_at)}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    Late {s.late_minutes} · Break {s.total_break_minutes} · OT {s.overtime_minutes}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Missed a day?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Request a correction for a past day (last {BACKDATE_LIMIT_DAYS} days). HR reviews
            it before it's applied — nothing changes until they approve it.
          </p>
          <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Request a correction</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request a correction</DialogTitle>
                <DialogDescription>
                  Tell HR what actually happened — they'll approve or reject it.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="correction-date">Date</Label>
                  <Input
                    id="correction-date"
                    type="date"
                    value={correctionDate}
                    min={minCorrectionDate}
                    max={toYmd(today)}
                    onChange={(e) => setCorrectionDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select
                    value={correctionAction}
                    onValueChange={(v) => setCorrectionAction(v as CorrectionAction)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">In</SelectItem>
                      <SelectItem value="BREAK">Break</SelectItem>
                      <SelectItem value="BACK">Back</SelectItem>
                      <SelectItem value="OUT">Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="correction-time">What time did this actually happen?</Label>
                  <Input
                    id="correction-time"
                    type="time"
                    value={correctionTime}
                    onChange={(e) => setCorrectionTime(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="correction-reason">Reason (optional)</Label>
                  <Textarea
                    id="correction-reason"
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="Forgot to clock out before leaving"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCorrectionOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => correctionM.mutate()} disabled={correctionM.isPending}>
                  {correctionM.isPending ? "Sending…" : "Send request"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
