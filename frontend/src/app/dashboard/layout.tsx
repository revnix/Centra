'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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

interface NavItem {
  href?: string;
  label: string;
  icon: any;
  children?: NavSubItem[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',             label: 'Overview',     icon: LayoutDashboard },
  {
    label: 'Jobs',
    icon: Briefcase,
    children: [
      { href: '/dashboard/jobs/new',       label: 'Create New Job',     icon: Plus },
      { href: '/dashboard/jobs',           label: 'All Jobs',           icon: Briefcase },
      { href: '/dashboard/generated-jobs', label: 'AI Generated Jobs', icon: Sparkles },
    ],
  },
  {
    label: 'Applications',
    icon: Users,
    children: [
      { href: '/dashboard/applications', label: 'All Applications', icon: Users },
      { href: '/dashboard/inbox',        label: 'Inbox Sync',       icon: Inbox },
      { href: '/dashboard/candidates/pool', label: 'Resume Pooling', icon: DatabaseZap },
    ],
  },
  { href: '/dashboard/pipeline',    label: 'Pipeline',     icon: Layers },
  { href: '/dashboard/onboarding',  label: 'Onboarding',   icon: UserCheck },
  { href: '/dashboard/interviews',  label: 'Interviews',   icon: Calendar },
  { href: '/dashboard/integrations',label: 'Integrations', icon: Share2 },
  { href: '/dashboard/admin',       label: 'Settings',     icon: Shield },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const { isSidebarOpen, toggleSidebar } = useUIStore();
    const { data: stats } = useDashboardStats();
    const pendingActions = stats?.pending_actions || 0;

    // The sidebar used to show a hardcoded "Admin User / admin@company.com" regardless
    // of who was actually logged in, which made it impossible to tell which account a
    // session belonged to. Read the real values login stored instead.
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    useEffect(() => {
        setCurrentUserEmail(localStorage.getItem('userEmail'));
        setCurrentUserRole(localStorage.getItem('userRole'));
    }, []);

    // Background-prefetch the most-visited pages' data right after layout mounts.
    // By the time the user clicks Jobs or Applications the data is already in cache
    // and the page renders with zero network wait.
    //
    // The route-bundle prefetch is deliberately delayed: firing router.prefetch()
    // immediately on mount races with Turbopack's on-demand dev compilation (routes
    // are compiled lazily on first request) and the dev server can return a spurious
    // 404 for a route that exists and works fine on a real click. A short delay lets
    // the current route's own compile settle first. Production builds are pre-compiled
    // so this race doesn't exist there, but the delay is harmless either way.
    useEffect(() => {
        const staleTime = 5 * 60_000;
        PREFETCH_QUERIES.forEach(({ queryKey, queryFn }) => {
            queryClient.prefetchQuery({ queryKey, queryFn, staleTime });
        });
        const timer = setTimeout(() => {
            NAVIGATION.forEach(({ href }) => router.prefetch(href));
        }, 1500);
        return () => clearTimeout(timer);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleLogout = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userEmail');
            document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        }
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50">
            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } w-72 gradient-sidebar shadow-2xl shadow-indigo-500/10`}
            >
                <div className="flex flex-col h-full relative overflow-hidden">
                    {/* Decorative gradient orbs */}
                    <div className="absolute top-20 -right-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-40 -left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

                    {/* Logo */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-pulse-glow">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                                Evalyn
                            </h1>
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className="lg:hidden text-white/70 hover:text-white hover:bg-white/10"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2 relative z-10">
                        {NAVIGATION.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    prefetch={true}
                                    className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${isActive
                                        ? 'bg-gradient-to-r from-indigo-500/30 to-purple-500/20 text-white shadow-lg shadow-indigo-500/10 border border-indigo-400/20'
                                        : 'text-indigo-200 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg transition-all duration-200 ${isActive
                                        ? 'bg-indigo-500/30'
                                        : 'bg-white/5 group-hover:bg-indigo-500/20'
                                        }`}>
                                        <item.icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'
                                            }`} />
                                    </div>
                                    <span className="font-medium flex-1">{item.name}</span>
                                    {isActive && (
                                        <ChevronRight className="h-4 w-4 text-indigo-300" />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t border-white/10 relative z-10">
                        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/5">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-indigo-400/30">
                                {currentUserEmail ? currentUserEmail.slice(0, 2).toUpperCase() : "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-white truncate capitalize">{currentUserRole || "Unknown role"}</p>
                                <p className="text-sm text-indigo-300 truncate">{currentUserEmail || "Not signed in"}</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLogout}
                            className="w-full justify-start text-indigo-300 hover:text-white hover:bg-white/10 border border-white/10"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                  )}
                </div>
              );
            }

            // ── Regular nav item ────────────────────────────────
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href!));
            return (
              <Link
                key={item.href}
                href={item.href!}
                className={`group relative flex items-center gap-3.5 px-3 py-3 rounded-xl text-[0.85rem] font-medium transition-all duration-200 ${
                  isActive
                    ? 'sidebar-active'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                {!collapsed && (
                  <span className="truncate flex-1">{item.label}</span>
                )}
                {isActive && collapsed && (
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>


        {/* User profile / Logout */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
          <div className={`flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg border border-white/10">
              {getInitials(userEmail)}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">Premium Workspace</p>
                <p className="text-xs text-slate-400 truncate">{userEmail}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                className="text-slate-500 hover:text-rose-400 p-2 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
        
        {/* Floating Top Navbar */}
        <div className="p-4 pb-0">
          <header className="h-16 bg-white/70 backdrop-blur-xl border border-white shadow-sm rounded-2xl px-6 flex items-center justify-between gap-4 z-20 sticky top-4">
            
            {/* Global search trigger */}
            <button
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-100/50 hover:bg-slate-100 border border-slate-200/50 text-sm text-slate-500 transition-colors w-96 shadow-inner"
            >
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="flex-1 text-left truncate">Search candidates, run commands...</span>
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-xs font-mono font-semibold text-slate-400 shadow-sm flex items-center gap-1">
                <Command className="w-3 h-3" /> K
              </span>
            </button>

            {/* Action buttons & Profile */}
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border-2 border-white"></span>
              </button>
            </div>
          </header>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

    </div>
  );
}
