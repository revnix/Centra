"use client";

import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { useMe } from "@/lib/hooks/useMe";
import { useDepartments } from "@/lib/hooks/useDepartments";
import { useTeamMembers } from "@/lib/hooks/useTeamMembers";

export default function TeamPage() {
  const { data: me, isLoading: meLoading } = useMe();
  const { data: departments } = useDepartments();
  const myLeadDeptIds = useMemo(() => {
    const id = me?.id;
    if (!id) return [];
    return (departments ?? []).filter((d) => d.lead_user_id === id).map((d) => d.id);
  }, [departments, me?.id]);

  const isLead = myLeadDeptIds.length > 0;
  const { data: teamMembers = [], isLoading: empLoading } = useTeamMembers(isLead);

  if (meLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!me) return <div className="text-sm text-destructive">Not logged in</div>;


  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Team</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {isLead ? (
              <span>
                You are lead of {myLeadDeptIds.length} department(s). <Badge variant="secondary">Lead</Badge>
              </span>
            ) : (
              "You are not assigned as a department lead."
            )}
          </div>

          {empLoading ? (
            <div className="text-sm text-muted-foreground">Loading members…</div>
          ) : !isLead ? null : teamMembers.length === 0 ? (
            <div className="text-sm text-muted-foreground">No team members found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Title</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((m) => (
                  <TableRow key={m.employee_profile_id}>
                    <TableCell className="font-medium">{m.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{m.email}</TableCell>
                    <TableCell className="text-muted-foreground">{m.job_title || "—"}</TableCell>
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