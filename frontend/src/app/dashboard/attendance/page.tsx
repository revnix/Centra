"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";

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

export default function AttendancePage() {
  const qc = useQueryClient();

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

  const inM = useMutation({
    mutationFn: () => attendanceApi.in(),
    onSuccess: invalidate,
  });
  const breakM = useMutation({
    mutationFn: () => attendanceApi.break(),
    onSuccess: invalidate,
  });
  const backM = useMutation({
    mutationFn: () => attendanceApi.back(),
    onSuccess: invalidate,
  });
  const outM = useMutation({
    mutationFn: () => attendanceApi.out(),
    onSuccess: invalidate,
  });

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

          {(inM.error || breakM.error || backM.error || outM.error) && (
            <div className="text-sm text-foreground">
              {(inM.error as any)?.message ||
                (breakM.error as any)?.message ||
                (backM.error as any)?.message ||
                (outM.error as any)?.message}
            </div>
          )}

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
            <div className="text-sm">{(sessionsQ.error as any)?.message || "Failed to load"}</div>
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
