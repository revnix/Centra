import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
    Users,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Download,
    ExternalLink,
    CheckCircle2,
    XCircle,
    Clock,
    MessageSquare,
    FileText,
    Brain,
    ThumbsUp,
    ThumbsDown,
    ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Candidate Detail Page
 * Comprehensive view of a candidate including Resume, AI Analysis, and Interview Transcripts
 */

// Mock data
const mockCandidate = {
    id: '1',
    name: 'Sarah Chen',
    email: 'sarah.chen@email.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    avatar: 'SC',
    role: 'Senior Frontend Engineer',
    stage: 'interview',
    matchScore: 92,
    confidence: 88,
    appliedDate: '2026-01-12',
    education: 'BS Computer Science, Stanford University',
    experience: '6 years',
    skills: ['React', 'TypeScript', 'Node.js', 'GraphQL', 'AWS'],
    aiAnalysis: {
        summary: "Sarah is an exceptionally strong candidate for the Senior Frontend Engineer role. She demonstrates deep expertise in React infrastructure and has specific experience scaling applications similar to our tech stack.",
        strengths: [
            "Deep understanding of React rendering optimization",
            "Experience leading teams of 5+ engineers",
            "Strong system design capabilities demonstrated in previous roles"
        ],
        weaknesses: [
            "Limited experience with our specific CI/CD pipeline tools (but adaptable)",
            "Salary expectations are at the top of our band"
        ],
        technicalScore: 94,
        culturalScore: 89,
        communicationScore: 92
    },
    transcript: [
        { role: 'ai', content: "Could you describe a challenging technical architectural decision you had to make recently?", time: "10:02 AM" },
        { role: 'user', content: "Recently, we had to migrate our legacy monolithic frontend to a micro-frontend architecture. The main challenge was maintaining state consistency across different apps. I decided to implement a shared Redux store using module federation...", time: "10:04 AM" },
        { role: 'ai', content: "That's interesting. How did you handle the version mismatch issues commonly associated with module federation?", time: "10:05 AM" },
        { role: 'user', content: "We established a strict governance model for shared dependencies and used semantic versioning with a dedicated platform team to manage core libraries...", time: "10:07 AM" }
    ]
};

export default function CandidateDetailPage({ params }: { params: { id: string } }) {
    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-600';
        if (score >= 75) return 'text-amber-600';
        return 'text-red-600';
    };

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Button variant="ghost" className="pl-0 hover:bg-transparent" asChild>
                <Link href="/dashboard/jobs/1/candidates">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back to Pipeline
                </Link>
            </Button>

            {/* Header Profile Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        <Avatar className="h-24 w-24">
                            <AvatarFallback className="text-2xl bg-blue-100 text-blue-700">
                                {mockCandidate.avatar}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 space-y-4">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">{mockCandidate.name}</h1>
                                    <p className="text-slate-500 font-medium">{mockCandidate.role}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                        <ThumbsDown className="h-4 w-4 mr-2" />
                                        Reject
                                    </Button>
                                    <Button className="bg-green-600 hover:bg-green-700">
                                        <ThumbsUp className="h-4 w-4 mr-2" />
                                        Advance to Next Stage
                                    </Button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                                <div className="flex items-center gap-1">
                                    <Mail className="h-4 w-4" />
                                    {mockCandidate.email}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Phone className="h-4 w-4" />
                                    {mockCandidate.phone}
                                </div>
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {mockCandidate.location}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    Applied {new Date(mockCandidate.appliedDate).toLocaleDateString()}
                                </div>
                            </div>

                            <div className="flex gap-2 mt-2">
                                {mockCandidate.skills.map(skill => (
                                    <Badge key={skill} variant="secondary" className="bg-slate-100">
                                        {skill}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 min-w-[150px] border-l pl-6 border-slate-100">
                            <div>
                                <p className="text-sm text-slate-500 mb-1">AI Match Score</p>
                                <div className={`text-3xl font-bold ${getScoreColor(mockCandidate.matchScore)}`}>
                                    {mockCandidate.matchScore}%
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Confidence</p>
                                <div className="text-xl font-semibold text-slate-700">
                                    {mockCandidate.confidence}%
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs defaultValue="ai-analysis" className="space-y-4">
                <TabsList className="bg-white border text-slate-500">
                    <TabsTrigger value="ai-analysis" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                        <Brain className="h-4 w-4 mr-2" />
                        AI Analysis
                    </TabsTrigger>
                    <TabsTrigger value="resume" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                        <FileText className="h-4 w-4 mr-2" />
                        Resume
                    </TabsTrigger>
                    <TabsTrigger value="transcript" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Interview Transcript
                    </TabsTrigger>
                </TabsList>

                {/* AI Analysis Tab */}
                <TabsContent value="ai-analysis" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>AI Executive Summary</CardTitle>
                                <CardDescription>Generated assessment based on resume and initial screening</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <Alert className="bg-blue-50 border-blue-200">
                                    <Brain className="h-4 w-4 text-blue-600" />
                                    <AlertTitle className="text-blue-800">Recommendation: Strong Hire</AlertTitle>
                                    <AlertDescription className="text-blue-700 mt-1">
                                        {mockCandidate.aiAnalysis.summary}
                                    </AlertDescription>
                                </Alert>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="font-semibold text-green-700 flex items-center gap-2 mb-3">
                                            <CheckCircle2 className="h-5 w-5" /> Key Strengths
                                        </h3>
                                        <ul className="space-y-2">
                                            {mockCandidate.aiAnalysis.strengths.map((item, i) => (
                                                <li key={i} className="text-sm text-slate-700 bg-green-50 p-2 rounded">
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-amber-700 flex items-center gap-2 mb-3">
                                            <AlertCircle className="h-5 w-5" /> Areas to Probe
                                        </h3>
                                        <ul className="space-y-2">
                                            {mockCandidate.aiAnalysis.weaknesses.map((item, i) => (
                                                <li key={i} className="text-sm text-slate-700 bg-amber-50 p-2 rounded">
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Score Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm font-medium">Technical Skills</span>
                                        <span className="text-sm font-bold">{mockCandidate.aiAnalysis.technicalScore}/100</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${mockCandidate.aiAnalysis.technicalScore}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm font-medium">Communication</span>
                                        <span className="text-sm font-bold">{mockCandidate.aiAnalysis.communicationScore}/100</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${mockCandidate.aiAnalysis.communicationScore}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm font-medium">Cultural Fit</span>
                                        <span className="text-sm font-bold">{mockCandidate.aiAnalysis.culturalScore}/100</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${mockCandidate.aiAnalysis.culturalScore}%` }} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Resume Tab */}
                <TabsContent value="resume">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Resume Viewer</CardTitle>
                                <CardDescription>Parsed content from uploaded PDF</CardDescription>
                            </div>
                            <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Download Original
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-slate-50 p-8 rounded-lg border border-slate-200 min-h-[500px] font-mono text-sm text-slate-700 whitespace-pre-wrap">
                                {`SARAH CHEN
San Francisco, CA • sarah.chen@email.com • (555) 123-4567

SUMMARY
Senior Frontend Engineer with 6 years of experience building scalable web applications. Expert in React ecosystem and performance optimization.

EXPERIENCE
Leap Motion • Senior Frontend Engineer
2023 - Present
- Led migration of legacy dashboard to Next.js, improving load time by 40%
- Mentored 3 junior engineers and established code review standards
- Implemented real-time collaboration features using WebSockets

TechStart Inc • Frontend Engineer
2020 - 2023
- Built component library used across 5 products
- Optimized CI/CD pipeline reducing build times by 50%

EDUCATION
Stanford University • BS Computer Science
2016-2020`}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Transcript Tab */}
                <TabsContent value="transcript">
                    <Card>
                        <CardHeader>
                            <CardTitle>Initial Screening Interview</CardTitle>
                            <CardDescription>Automated detailed technical screening transcript</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-w-3xl mx-auto">
                                {mockCandidate.transcript.map((msg, i) => (
                                    <div key={i} className={`flex gap-4 ${msg.role === 'ai' ? 'bg-slate-50' : 'bg-blue-50'} p-4 rounded-lg`}>
                                        <div className="flex-shrink-0 mt-1">
                                            {msg.role === 'ai' ? (
                                                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                                                    <Brain className="h-4 w-4 text-slate-600" />
                                                </div>
                                            ) : (
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback className="bg-blue-200 text-blue-700 text-xs">SC</AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-semibold text-slate-900">
                                                    {msg.role === 'ai' ? 'AI Interviewer' : mockCandidate.name}
                                                </span>
                                                <span className="text-xs text-slate-500">{msg.time}</span>
                                            </div>
                                            <p className="text-slate-700 text-sm leading-relaxed">
                                                {msg.content}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    );
}

function AlertCircle({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
    )
}
