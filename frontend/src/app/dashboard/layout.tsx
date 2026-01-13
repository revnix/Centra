'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUIStore } from '@/lib/stores/uiStore';
import {
    Briefcase,
    Users,
    MessageSquare,
    Menu,
    X,
    LogOut,
    Bell,
    Link2
} from 'lucide-react';

/**
 * Dashboard Layout
 * Provides navigation sidebar and header for admin/reviewer users
 */

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { isSidebarOpen, toggleSidebar } = useUIStore();
    const [pendingActions, setPendingActions] = useState(0);

    useEffect(() => {
        // TODO: Fetch pending action count from API
        setPendingActions(3);
    }, []);

    const handleLogout = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_role');
        }
        router.push('/login');
    };

    const navigation = [
        { name: 'Jobs', href: '/dashboard/jobs', icon: Briefcase },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-40 h-screen transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } w-64 bg-white border-r border-slate-200`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-200">
                        <h1 className="text-xl font-bold text-slate-900">Evalyn</h1>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className="lg:hidden"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2">
                        {navigation.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    <item.icon className="h-5 w-5" />
                                    <span className="font-medium">{item.name}</span>
                                </Link>
                            );
                        })}

                        {/* Integrations at bottom */}
                        <div className="pt-4 mt-4 border-t border-slate-200">
                            <Link
                                href="/dashboard/integrations"
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${pathname.startsWith('/dashboard/integrations')
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                            >
                                <Link2 className="h-5 w-5" />
                                <span className="font-medium">Integrations</span>
                            </Link>
                        </div>
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-sm">
                                <p className="font-medium text-slate-900">Admin User</p>
                                <p className="text-slate-500">admin@company.com</p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleLogout}
                            className="w-full"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className={`transition-all ${isSidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
                {/* Top bar */}
                <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
                    <div className="flex items-center justify-between px-6 py-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className={isSidebarOpen ? 'lg:hidden' : ''}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>

                        <div className="flex items-center gap-4">
                            {/* Human action required indicator */}
                            {pendingActions > 0 && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                                    <Bell className="h-4 w-4 text-amber-600 animate-pulse" />
                                    <span className="text-sm font-medium text-amber-900">
                                        {pendingActions} action{pendingActions !== 1 ? 's' : ''} required
                                    </span>
                                    <Badge variant="default" className="bg-amber-600">
                                        {pendingActions}
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-6">{children}</main>
            </div>
        </div>
    );
}
