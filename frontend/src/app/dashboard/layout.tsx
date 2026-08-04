'use client';

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
