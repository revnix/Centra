"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { CommandPalette } from "@/components/CommandPalette";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    setEmail(localStorage.getItem("userEmail") || "");
    setRole(localStorage.getItem("userRole") || "admin");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  };

  return (
    <SidebarProvider defaultOpen>
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />

      <AppSidebar role={role} email={email} onLogout={handleLogout} />
      <SidebarRail />

      <SidebarInset>
        <header className="sticky top-0 z-30 w-full border-b bg-background">
          <div className="flex h-16 items-center justify-between gap-3 px-4">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-5" />
              <div className="min-w-0">
                <div className="font-semibold leading-none truncate">Dashboard</div>
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
