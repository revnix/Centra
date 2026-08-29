"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";

import { attendanceApi, type LeaveRequest } from "@/lib/api";

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
import { Textarea } from "@/components/ui/textarea";

function fmtDate(d: string): string {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return format(dt, "PP");
}

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "APPROVED") return "default";
  if (status === "REJECTED") return "destructive";
  return "secondary";
}

export default function LeavePage() {
  const qc = useQueryClient();

  const leaveQ = useQuery({
    queryKey: ["attendance", "leave", "me"],
    queryFn: () => attendanceApi.myLeaveRequests(),
    staleTime: 10_000,
  });
  const requests: LeaveRequest[] = leaveQ.data ?? [];

  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const requestM = useMutation({
    mutationFn: () =>
      attendanceApi.requestLeave({
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || null,
      }),
    onSuccess: async () => {
      toast.success("Leave request sent");
      setOpen(false);
      setStartDate("");
      setEndDate("");
      setReason("");
      await qc.invalidateQueries({ queryKey: ["attendance", "leave"] });
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to send leave request");
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Leave</h1>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Request leave</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request leave</DialogTitle>
              <DialogDescription>HR will approve or reject this.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="leave-start">From</Label>
                  <Input
                    id="leave-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leave-end">To</Label>
                  <Input
                    id="leave-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="leave-reason">Reason (optional)</Label>
                <Textarea
                  id="leave-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Family event"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => requestM.mutate()}
                disabled={requestM.isPending || !startDate || !endDate}
              >
                {requestM.isPending ? "Sending…" : "Send request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your requests</CardTitle>
        </CardHeader>
        <CardContent>
          {leaveQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : requests.length === 0 ? (
            <div className="text-sm text-muted-foreground">No leave requests yet.</div>
          ) : (
            <div className="divide-y rounded-lg border">
              {requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {fmtDate(r.start_date)} – {fmtDate(r.end_date)}
                    </div>
                    {r.reason ? (
                      <div className="text-xs text-muted-foreground truncate">{r.reason}</div>
                    ) : null}
                  </div>
                  <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
