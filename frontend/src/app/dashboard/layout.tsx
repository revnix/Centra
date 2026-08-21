"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

import { useMe } from "@/lib/hooks/useMe";
import { useIsDepartmentLead } from "@/lib/hooks/useLeadStatus";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: me, isLoading } = useMe();

  const role = (me?.role || "").toLowerCase();
  const email = me?.email || "";
  const isLead = useIsDepartmentLead(me?.id);

  const onLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    document.cookie =
      "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    document.cookie =
      "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    router.push("/login");
  };

  const headerTitle = useMemo(() => {
    if (!role) return "Dashboard";
    if (role === "candidate") return "Candidate Portal";
    if (role === "employee") return isLead ? "Lead Dashboard" : "Employee Dashboard";
    if (role === "hr") return "HR Dashboard";
    if (role === "reviewer") return "Reviewer Dashboard";
    return "Dashboard";
  }, [role, isLead]);

  if (isLoading) return null;
  if (!me) return null;

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar role={role} isLead={isLead} email={email} onLogout={onLogout} />
      <SidebarRail />

      <SidebarInset>
        <header className="sticky top-0 z-30 w-full border-b bg-background">
          <div className="flex h-16 items-center justify-between gap-3 px-4">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-5" />
              <div className="min-w-0">
                <div className="font-semibold leading-none truncate">{headerTitle}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {role === "candidate"
                    ? "Jobs & application status"
                    : role === "employee"
                      ? (isLead ? "Team & approvals" : "Your profile & attendance")
                      : "Hiring & operations"}
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground truncate">{email}</div>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
