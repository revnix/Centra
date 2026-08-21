"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Zap, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppRole, NavItem } from "@/lib/navigation";
import { navForRole } from "@/lib/navigation";

export function AppSidebar({
  role,
  email,
  onLogout,
}: {
  role: AppRole;
  email: string;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const navItems: NavItem[] = navForRole(role);

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="px-3 py-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-foreground flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.2)]">
            <Zap className="h-5 w-5 text-white fill-white" />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold tracking-tight leading-none">Evalyn</div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-widest">
              {role === "candidate" ? "Candidate" : "Staff"}
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <Separator />

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                if (item.type === "item") {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                const groupActive = item.items.some(
                  (sub) => pathname === sub.href || pathname.startsWith(sub.href + "/")
                );

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton isActive={groupActive}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                      {item.items.map((sub) => {
                        const active = pathname === sub.href || pathname.startsWith(sub.href + "/");
                        return (
                          <SidebarMenuSubItem key={sub.href}>
                            <SidebarMenuSubButton asChild isActive={active}>
                              <Link href={sub.href}>
                                <sub.icon />
                                <span>{sub.label}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">{email || ""}</div>
            <div className="text-[11px] text-muted-foreground truncate">{String(role)}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
