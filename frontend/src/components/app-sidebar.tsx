"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { ChevronDown, LogOut, PanelLeft, Zap } from "lucide-react";

import type { AppRole, NavItem } from "@/lib/navigation";
import { navForUser } from "@/lib/navigation";

export function AppSidebar({
  role,
  email,
  isLead,
  onLogout,
}: {
  role: AppRole;
  email: string;
  isLead?: boolean;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  const navItems: NavItem[] = useMemo(
    () => navForUser(role, { isLead }),
    [role, isLead]
  );

  const groupLabels = useMemo(
    () => navItems.filter((i) => i.type === "group").map((i) => i.label),
    [navItems]
  );
  const groupLabelsKey = useMemo(() => groupLabels.join("|"), [groupLabels]);

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const label of groupLabels) {
      try {
        const raw = localStorage.getItem(`sidebar_group_open:${label}`);
        initial[label] = raw === null ? true : raw === "true";
      } catch {
        initial[label] = true;
      }
    }
    return initial;
  });

  useEffect(() => {
    // Keep state in sync when nav groups change (role change, etc.)
    setOpenMap((prev) => {
      let changed = false;
      const next: Record<string, boolean> = { ...prev };

      // Add new labels
      for (const label of groupLabels) {
        if (label in next) continue;
        changed = true;
        try {
          const raw = localStorage.getItem(`sidebar_group_open:${label}`);
          next[label] = raw === null ? true : raw === "true";
        } catch {
          next[label] = true;
        }
      }

      // Remove missing labels
      for (const label of Object.keys(next)) {
        if (groupLabels.includes(label)) continue;
        changed = true;
        delete next[label];
      }

      return changed ? next : prev;
    });
  }, [groupLabelsKey, groupLabels]);

  const setGroupOpen = (label: string, nextOpen: boolean) => {
    setOpenMap((prev) => ({ ...prev, [label]: nextOpen }));
    try {
      localStorage.setItem(`sidebar_group_open:${label}`, String(nextOpen));
    } catch {
      // ignore
    }
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-foreground flex items-center justify-center">
              <Zap className="h-5 w-5 text-background fill-background" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold tracking-tight leading-none">Evalyn</div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-widest">
                {String(role).toLowerCase() === "candidate" ? "Candidate" : "Staff"}
              </div>
            </div>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            className="shrink-0"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
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
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                const groupActive = item.items.some(
                  (sub) => pathname === sub.href || pathname.startsWith(sub.href + "/")
                );

                const open = openMap[item.label] ?? true;

                return (
                  <Collapsible
                    key={item.label}
                    open={open}
                    onOpenChange={(v) => setGroupOpen(item.label, v)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton isActive={groupActive} tooltip={item.label}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                          <ChevronDown
                            className={
                              "ml-auto h-4 w-4 text-muted-foreground transition-transform " +
                              (open ? "rotate-180" : "")
                            }
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((sub) => {
                            const active = pathname === sub.href || pathname.startsWith(sub.href + "/");
                            return (
                              <SidebarMenuSubItem key={sub.href}>
                                <SidebarMenuSubButton asChild isActive={active}>
                                  <Link href={sub.href}>
                                    <sub.icon className="h-4 w-4" />
                                    <span>{sub.label}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
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
