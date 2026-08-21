"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { toast } from "sonner";

import { attendanceApi, type AttendanceSession } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
    </div>
  );
}
