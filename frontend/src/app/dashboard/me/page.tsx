"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useMe } from "@/lib/hooks/useMe";

export default function MePage() {
  const { data: me, isLoading, error } = useMe();

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (error || !me) return <div className="text-sm text-destructive">Failed to load profile</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium">Name</div>
            <div className="text-sm text-muted-foreground">{me.full_name || "—"}</div>
          </div>
          <Separator />
          <div>
            <div className="text-sm font-medium">Email</div>
            <div className="text-sm text-muted-foreground">{me.email}</div>
          </div>
          <Separator />
          <div>
            <div className="text-sm font-medium">Role</div>
            <div className="text-sm text-muted-foreground">{me.role}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
