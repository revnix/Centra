"use client";

import { use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    CheckCircle2,
    Circle,
    Clock,
    Calendar,
    FileText,
    Video,
    Code,
    MessageSquare,
    Mail,
    Sparkles
} from 'lucide-react';

/**
 * Token-based Application Status Page
 * Works for both guest applicants (with token) and logged-in users
 */

// Mock data
const mockApplication = {
    jobTitle: 'Senior Frontend Engineer',
    company: 'TechCorp Inc.',
    appliedDate: '2026-01-08',
    currentStage: 'interview',
    stages: [
        { name: 'Start Application', status: 'completed', date: '2026-01-08' },
        { name: 'Resume Screening', status: 'completed', date: '2026-01-09' },
        { name: 'AI Assessment', status: 'current', date: '2026-01-13' },
        { name: 'Final Decision', status: 'upcoming', date: null },
    ],
    timeline: [
        {
            date: '2026-01-13 10:30 AM',
            title: 'AI Interview Scheduled',
            description: 'Your AI-led technical interview has been scheduled',
            type: 'info',
        },
        {
            date: '2026-01-09 2:15 PM',
            title: 'Resume Screening Passed',
            description: 'Great news! Your resume matches 87% of our requirements',
            type: 'success',
        },
        {
            date: '2026-01-08 9:00 AM',
            title: 'Application Submitted',
            description: 'Your application was successfully received',
            type: 'info',
        },
    ],
    upcomingTasks: [
        {
            id: 1,
            title: 'Complete AI Assessment',
            description: 'Technical interview and coding challenge (45 min)',
            dueDate: '2026-01-13',
            type: 'interview',
            action: '/portal/interview/123',
        },
    ],
    matchScore: 87,
};

export default function PortalStatusPage({
    params
}: {
    params?: Promise<{ token: string }>
}) {
    // Support both /portal/status (logged in) and /portal/status/[token] (guest)
    const token = params ? use(params).token : null;
    const isGuest = !!token;

    const getStageIcon = (status: string) => {
        if (status === 'completed') return <CheckCircle2 className="h-6 w-6 text-green-600" />;
        if (status === 'current') return <Clock className="h-6 w-6 text-blue-600 animate-pulse" />;
        return <Circle className="h-6 w-6 text-slate-300" />;
    };

    const getTypeIcon = (type: string) => {
        const icons: Record<string, any> = {
            interview: Video,
            coding: Code,
            document: FileText,
            message: MessageSquare,
        };
        const Icon = icons[type] || FileText;
        return <Icon className="h-5 w-5" />;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">
                                {mockApplication.jobTitle}
                            </h1>
                            <p className="text-slate-500 mt-1">{mockApplication.company}</p>
                        </div>
                        <Badge variant="default" className="bg-blue-600 text-white px-4 py-2 text-sm">
                            {mockApplication.matchScore}% Match
                        </Badge>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="h-4 w-4" />
                        <span>Applied on {new Date(mockApplication.appliedDate).toLocaleDateString()}</span>
                    </div>
                </div>

                {/* Guest Registration Banner */}
                {isGuest && (
                    <Card className="bg-gradient-to-r from-purple-600 to-blue-600 border-0 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <Sparkles className="h-6 w-6 flex-shrink-0 mt-1" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg mb-1">
                                        Want to track multiple applications?
                                    </h3>
                                    <p className="text-purple-100 text-sm mb-4">
                                        Create a free account to save your progress, apply to more jobs, and get notifications
                                    </p>
                                    <Button
                                        className="bg-white text-purple-600 hover:bg-purple-50"
                                        onClick={() => window.location.href = "/signup"}
                                    >
                                        Create Free Account
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Progress Stepper */}
                <Card>
                    <CardHeader>
                        <CardTitle>Application Progress</CardTitle>
                        <CardDescription>Track your journey through our hiring process</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            {/* Progress bar background */}
                            <div className="absolute top-3 left-0 right-0 h-0.5 bg-slate-200" />

                            {/* Active progress bar */}
                            <div
                                className="absolute top-3 left-0 h-0.5 bg-blue-600 transition-all duration-500"
                                style={{
                                    width: `${(mockApplication.stages.filter(s => s.status === 'completed').length / mockApplication.stages.length) * 100}%`
                                }}
                            />

                            {/* Stages */}
                            <div className="relative flex justify-between">
                                {mockApplication.stages.map((stage, index) => (
                                    <div key={index} className="flex flex-col items-center" style={{ flex: 1 }}>
                                        <div className="bg-white p-1 rounded-full">
                                            {getStageIcon(stage.status)}
                                        </div>
                                        <div className="mt-3 text-center">
                                            <p className={`text-sm font-medium ${stage.status === 'current' ? 'text-blue-600' :
                                                stage.status === 'completed' ? 'text-green-600' :
                                                    'text-slate-400'
                                                }`}>
                                                {stage.name}
                                            </p>
                                            {stage.date && (
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {new Date(stage.date).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Upcoming Tasks */}
                {mockApplication.upcomingTasks.length > 0 && (
                    <Card className="border-l-4 border-l-amber-500">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-amber-600" />
                                Action Required
                            </CardTitle>
                            <CardDescription>Complete these tasks to move forward</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {mockApplication.upcomingTasks.map((task) => (
                                <div key={task.id} className="flex items-start gap-4 p-4 bg-amber-50 rounded-lg">
                                    <div className="p-2 bg-amber-100 rounded-lg">
                                        {getTypeIcon(task.type)}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-slate-900">{task.title}</h4>
                                        <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                            <Calendar className="h-3 w-3" />
                                            <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="bg-amber-600 hover:bg-amber-700"
                                        onClick={() => window.location.href = task.action}
                                    >
                                        Start
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Timeline */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Activity Timeline</CardTitle>
                            <CardDescription>Recent updates on your application</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {mockApplication.timeline.map((event, index) => (
                                    <div key={index} className="relative pl-6 pb-6 border-l-2 border-slate-200 last:pb-0">
                                        <div className={`absolute -left-2 top-0 h-4 w-4 rounded-full ${event.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                                            }`} />
                                        <div>
                                            <p className="text-xs text-slate-500">{event.date}</p>
                                            <h4 className="font-semibold text-slate-900 mt-1">{event.title}</h4>
                                            <p className="text-sm text-slate-600 mt-1">{event.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Help & Contact */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>What&apos;s Next?</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Video className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-slate-900">AI Assessment</h4>
                                        <p className="text-sm text-slate-600">
                                            Complete your technical interview and coding challenge in one session
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-50">
                            <CardHeader>
                                <CardTitle className="text-base">Need Help?</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-sm text-slate-600">
                                    If you have questions about the hiring process or technical issues:
                                </p>
                                <Button variant="outline" className="w-full justify-start" size="sm">
                                    <Mail className="h-4 w-4 mr-2" />
                                    Contact Support
                                </Button>
                                <div className="text-xs text-slate-500 border-t border-slate-200 pt-3">
                                    <p>Average response time: 2-4 hours</p>
                                    <p className="mt-1">Support hours: Mon-Fri, 9am-6pm EST</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Tips */}
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <MessageSquare className="h-5 w-5 text-blue-600" />
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-blue-900">Interview Tips</h4>
                                <ul className="mt-2 space-y-1 text-sm text-blue-800">
                                    <li>• Find a quiet space with good internet connection</li>
                                    <li>• Have your resume and project examples ready to reference</li>
                                    <li>• The interview is untimed - take your time to answer thoughtfully</li>
                                    <li>• You can pause and resume the interview anytime within 48 hours</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
