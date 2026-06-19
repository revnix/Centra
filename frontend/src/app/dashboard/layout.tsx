'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUIStore } from '@/lib/stores/uiStore';
import { useDashboardStats, jobKeys } from '@/lib/hooks/useJobs';
import { applicationKeys } from '@/lib/hooks/useApplications';
import { jobsApi } from '@/lib/api/jobs';
import { applicationsApi } from '@/lib/api/applications';
import {
    Briefcase,
    Menu,
    X,
    LogOut,
    Bell,
    Link2,
    Sparkles,
    ChevronRight,
    Users,
    ClipboardCheck,
    KanbanSquare
} from 'lucide-react';

// Defined outside component — never recreated on re-render
const NAVIGATION = [
    { name: 'Jobs', href: '/dashboard/jobs', icon: Briefcase },
    { name: 'Generated Jobs', href: '/dashboard/generated-jobs', icon: Sparkles },
    { name: 'Applications', href: '/dashboard/applications', icon: Users },
    { name: 'Pipeline', href: '/dashboard/pipeline', icon: KanbanSquare },
    { name: 'Onboarding', href: '/dashboard/onboarding', icon: ClipboardCheck },
    { name: 'Integrations', href: '/dashboard/integrations', icon: Link2 },
];

// Prefetch map: nav href → what data to warm up for that page
const PREFETCH_QUERIES = [
    {
        queryKey: jobKeys.list({}),
        queryFn: () => jobsApi.getAll(),
    },
    {
        queryKey: applicationKeys.lists(),
        queryFn: () => applicationsApi.list(),
    },
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

    // Background-prefetch the most-visited pages' data right after layout mounts.
    // By the time the user clicks Jobs or Applications the data is already in cache
    // and the page renders with zero network wait.
    useEffect(() => {
        const staleTime = 5 * 60_000;
        PREFETCH_QUERIES.forEach(({ queryKey, queryFn }) => {
            queryClient.prefetchQuery({ queryKey, queryFn, staleTime });
        });
        // Also prefetch the JS bundles for all sidebar routes
        NAVIGATION.forEach(({ href }) => router.prefetch(href));
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
                                AU
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-white truncate">Admin User</p>
                                <p className="text-sm text-indigo-300 truncate">admin@company.com</p>
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
                </div>
            </aside>

            {/* Main content */}
            <div className={`transition-all duration-300 ${isSidebarOpen ? 'lg:ml-72' : 'ml-0'}`}>
                {/* Top bar */}
                <header className="sticky top-0 z-30 glass border-b border-white/20">
                    <div className="flex items-center justify-between px-6 py-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className={`${isSidebarOpen ? 'lg:hidden' : ''} hover:bg-indigo-100`}
                        >
                            <Menu className="h-5 w-5 text-slate-700" />
                        </Button>

                        <div className="flex items-center gap-4">
                            {pendingActions > 0 && (
                                <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-xl shadow-lg shadow-amber-500/10">
                                    <div className="relative">
                                        <Bell className="h-5 w-5 text-amber-600" />
                                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
                                    </div>
                                    <span className="text-sm font-semibold text-amber-900">
                                        {pendingActions} action{pendingActions !== 1 ? 's' : ''} required
                                    </span>
                                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-md">
                                        {pendingActions}
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-6 lg:p-8">{children}</main>
            </div>
        </div>
    );
}
