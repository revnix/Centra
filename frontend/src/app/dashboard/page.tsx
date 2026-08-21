'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import AdminDashboardHome from '@/app/dashboard/_admin-home';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Users } from 'lucide-react';

export default function DashboardHome() {
  const [role, setRole] = useState<string>('');

  useEffect(() => {
    setRole((localStorage.getItem('userRole') || '').toLowerCase());
  }, []);

  const isCandidate = useMemo(() => role === 'candidate', [role]);

  if (!role) return null;

  if (!isCandidate) {
    return <AdminDashboardHome />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 mt-1">Track your applications and explore open roles.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" /> Available Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">Browse all open positions.</p>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/jobs">View Jobs</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" /> My Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">See applied, rejected, and selected statuses.</p>
            <Button asChild variant="secondary">
              <Link href="/portal/status">Open Status</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
