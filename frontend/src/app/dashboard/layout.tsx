"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Layers, Briefcase, Users, UserCheck, Inbox,
  Share2, Shield, LogOut, ChevronLeft, ChevronRight, Search, Command, Bell, Zap, ChevronDown, Sparkles, Plus, DatabaseZap, Calendar
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { CommandPalette } from '@/components/CommandPalette';

interface NavSubItem {
  href: string;
  label: string;
  icon: any;
}

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [cmdOpen, setCmdOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<string[]>([]);

  useEffect(() => {
    setUserEmail(localStorage.getItem('userEmail') || 'test@gmail.com');
    setUserRole(localStorage.getItem('userRole') || 'admin');

    // Auto-open dropdowns whose children match the current path
    const toOpen: string[] = [];
    NAV_ITEMS.forEach(item => {
      if (item.children?.some(c => pathname === c.href || pathname.startsWith(c.href))) {
        toOpen.push(item.label);
      }
    });
    if (toOpen.length) setOpenDropdowns(toOpen);
  }, [pathname]);

  const toggleDropdown = (label: string) => {
    setOpenDropdowns(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    router.push('/login');
  };

  const getInitials = (email: string) => {
    if (!email) return 'EV';
    return email.slice(0, 2).toUpperCase();
  };

  const isSuperAdminUser = userEmail.toLowerCase() === 'test@gmail.com' || userRole === 'admin' || userEmail.toLowerCase().includes('admin');

  return (
    <div className="min-h-screen flex text-slate-800 font-sans" style={{ backgroundColor: 'var(--bg-main)' }}>
      
      {/* Command Palette */}
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
        style={{ backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
      >
        {/* Brand header */}
        <div className="h-20 flex items-center justify-between px-6 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            {!collapsed && (
              <span className="font-extrabold text-xl text-white tracking-tight">Evalyn</span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.filter(item => {
            if (item.href === '/dashboard/admin') return isSuperAdminUser;
            return true;
          }).map((item) => {
            // ── Dropdown group ──────────────────────────────────
            if (item.children) {
              const isGroupActive = item.children.some(c => pathname === c.href || pathname.startsWith(c.href));
              const isOpen = openDropdowns.includes(item.label);
              return (
                <div key={item.label}>
                  <button
                    onClick={() => {
                      if (collapsed) {
                        // In collapsed mode, navigate directly to first child
                        router.push(item.children![0].href);
                      } else {
                        toggleDropdown(item.label);
                      }
                    }}
                    className={`group w-full relative flex items-center gap-3.5 px-3 py-3 rounded-xl text-[0.85rem] font-medium transition-all duration-200 ${
                      isGroupActive
                        ? 'sidebar-active'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    } ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isGroupActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    {!collapsed && (
                      <>
                        <span className="truncate flex-1 text-left">{item.label}</span>
                        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${isGroupActive ? 'text-blue-400' : 'text-slate-500'}`} />
                      </>
                    )}
                    {isGroupActive && collapsed && (
                      <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
                    )}
                  </button>

                  {/* Sub-items */}
                  {!collapsed && isOpen && (
                    <div className="mt-1 ml-3 pl-3 border-l border-white/10 space-y-0.5">
                      {item.children.map(child => {
                        const isChildActive = pathname === child.href || pathname.startsWith(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[0.8rem] font-medium transition-all duration-200 ${
                              isChildActive
                                ? 'bg-blue-600/20 text-blue-300'
                                : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                            }`}
                          >
                            <child.icon className={`w-4 h-4 flex-shrink-0 ${isChildActive ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
                            <span className="truncate">{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground truncate">{email || ""}</div>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
