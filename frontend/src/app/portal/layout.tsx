'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut, Sparkles, User, Settings, Bell } from 'lucide-react';
import Link from 'next/link';

/**
 * Candidate Portal Layout
 * Premium, modern layout for candidate-facing pages
 */

export default function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();

    const handleLogout = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userEmail');
            // Clear cookies
            document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <div className="flex items-center gap-4">
                            <Link href="/portal/status" className="flex items-center gap-2 group">
                                <div className="p-2.5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                                    <Sparkles className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Evalyn <span className="text-blue-600">Portal</span></h1>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Candidate Experience</p>
                                </div>
                            </Link>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-4">
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600 rounded-full h-10 w-10">
                                <Bell className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600 rounded-full h-10 w-10">
                                <Settings className="h-5 w-5" />
                            </Button>
                            
                            <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden sm:block" />

                            <Button 
                                variant="ghost" 
                                className="text-slate-600 hover:text-red-600 hover:bg-red-50 font-semibold px-4 rounded-xl transition-all"
                                onClick={handleLogout}
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Sign Out</span>
                            </Button>
                            
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-slate-500 shadow-inner">
                                <User className="h-5 w-5" />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {children}
            </main>

            {/* Footer / Meta info */}
            <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-slate-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-slate-500 font-medium">
                        &copy; 2026 Evalyn AI. Secure Candidate Portal.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link href="/privacy" className="text-xs text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest">Privacy</Link>
                        <Link href="/terms" className="text-xs text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest">Terms</Link>
                        <Link href="/help" className="text-xs text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest">Help Center</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
