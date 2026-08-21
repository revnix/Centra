"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    setEmail(localStorage.getItem("userEmail") || "");
    setRole((localStorage.getItem("userRole") || "candidate").toLowerCase());
  }, []);

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
    return role === "candidate" ? "Candidate Portal" : "Dashboard";
  }, [role]);

  // Avoid rendering sidebar before we know role (prevents flicker)
  if (!role) return null;

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar role={role} email={email} onLogout={onLogout} />
      <SidebarRail />

      <SidebarInset>
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b">
          <div className="h-14 flex items-center gap-3 px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-5" />
            <div className="min-w-0">
              <div className="font-semibold leading-none truncate">{headerTitle}</div>
              <div className="text-xs text-muted-foreground truncate">
                {role === "candidate" ? "Jobs & application status" : "Hiring & operations"}
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
