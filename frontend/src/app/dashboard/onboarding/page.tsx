"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { onboardingApi, OnboardingResponse, getDocumentViewUrl } from "@/lib/api/onboarding";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Search, Clock, ShieldCheck, MonitorCheck, MapPin, UserCheck, Briefcase, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminOnboardingDashboard() {
    const [onboardings, setOnboardings] = useState<OnboardingResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    
    // Detailed View State
    const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
    const [detailedInfo, setDetailedInfo] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        fetchOnboardings();
    }, []);

    const fetchOnboardings = async () => {
        try {
            setLoading(true);
            const data = await onboardingApi.getAll();
            setOnboardings(data);
        } catch (err: any) {
            setError(err?.message || "Failed to fetch onboarding records");
        } finally {
            setLoading(false);
        }
    };

    const handleHrVerify = async (id: number) => {
        try {
            await onboardingApi.hrVerify(id, { hr_verified: true });
            await fetchOnboardings();
        } catch (err: any) {
            alert("Failed to verify: " + err.message);
        }
    };

    const handleHrDetailsUpdate = async (id: number, data: any) => {
        try {
            await onboardingApi.hrSetJoiningDetails(id, data);
            await fetchOnboardings();
        } catch (err: any) {
            alert("Update failed: " + err.message);
        }
    };
    
    const handleSendWelcomeEmail = async (id: number) => {
        try {
            await onboardingApi.sendWelcomeEmail(id);
            alert("Welcome email sent to candidate!");
        } catch (err: any) {
            alert("Failed to send email: " + err.message);
        }
    };

    const handleInductionToggle = async (id: number, current: OnboardingResponse, field: string, type: 'hr' | 'it' | 'manager') => {
        try {
            const data = { [field]: !(current as any)[field] };
            if (type === 'hr') await onboardingApi.hrInductionUpdate(id, data);
            else if (type === 'it') await onboardingApi.itInductionUpdate(id, data);
            else if (type === 'manager') await onboardingApi.managerInductionUpdate(id, data);
            await fetchOnboardings();
        } catch (err: any) {
            alert("Update failed: " + err.message);
        }
    };

    const handleItSetupToggle = async (id: number, current: OnboardingResponse, field: string) => {
        try {
            const data = { [field]: !(current as any)[field] };
            await onboardingApi.itSetupUpdate(id, data);
            await fetchOnboardings();
        } catch (err: any) {
            alert("IT Update failed: " + err.message);
        }
    };

    const handleOpenDetail = async (id: number) => {
        setSelectedCandidateId(id);
        try {
            setDetailLoading(true);
            const data = await onboardingApi.getHrDetails(id);
            setDetailedInfo(data);
        } catch (err: any) {
            alert("Failed to load details: " + err.message);
        } finally {
            setDetailLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-900 p-8 rounded-2xl text-white shadow-2xl relative overflow-hidden"
            >
                <div className="relative z-10">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
                            Onboarding Command Center
                        </h1>
                        <div className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </div>
                    </div>
                    <p className="text-indigo-200/80 mt-2 font-medium tracking-wide">
                        Enterprise Grade Candidate Provisioning & Induction
                    </p>
                </div>
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-50/10 rounded-full -ml-10 -mb-10 blur-2xl"></div>
            </motion.div>

            {error && <div className="text-red-500 p-4 bg-red-50 rounded-lg">{error}</div>}
            
            {loading ? (
                <div className="text-center p-12">Loading...</div>
            ) : (
                <div className="space-y-6">
                    {onboardings.length === 0 && (
                        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                            No active onboardings found.
                        </div>
                    )}
                    
                    <AnimatePresence>
                        {onboardings.map((o, idx) => (
                            <motion.div
                                key={o.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <Card className={`overflow-hidden shadow-lg border-0 bg-white/80 backdrop-blur-sm transition-all hover:shadow-xl ${o.status === 'COMPLETED' ? 'opacity-70 ring-1 ring-emerald-500/30' : 'ring-1 ring-slate-200'}`}>
                                    <div className={`h-1.5 w-full ${o.status === 'COMPLETED' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} />
                                    <CardHeader className="bg-slate-50/50 pb-4 border-b">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <CardTitle className="text-xl font-bold text-slate-900">
                                                    {o.candidate_name || `Application #${o.application_id}`}
                                                </CardTitle>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100/80 px-2 py-1 rounded-md border border-slate-200/50">
                                                        <Mail className="w-3 h-3" />
                                                        {o.email || "No email"}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100/50">
                                                        <Briefcase className="w-3 h-3" />
                                                        {o.job_title || "Position Pending"}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border ${
                                                        o.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                                        o.status.includes('PENDING') ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                                                        'bg-blue-50 text-blue-700 border-blue-100'
                                                    }`}>
                                                        {o.status.replace(/_/g, ' ')}
                                                    </span>
                                                    {o.joining_date && (
                                                        <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                                            <Clock className="w-3 h-3" />
                                                            Joining: {new Date(o.joining_date).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button 
                                                    variant="secondary" 
                                                    size="sm"
                                                    className="text-xs flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                                                    onClick={() => handleOpenDetail(o.application_id)}
                                                >
                                                    <Search className="w-3.5 h-3.5" />
                                                    View Documents
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    className="text-xs flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                                    onClick={() => handleSendWelcomeEmail(o.application_id)}
                                                >
                                                    <Mail className="w-3.5 h-3.5" />
                                                    Send Welcome Email
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                            {/* Document Verification Panel */}
                                            <div className="space-y-4">
                                                <h3 className="font-semibold flex items-center gap-2 text-slate-700 bg-slate-100 p-2 rounded-md">
                                                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                                                    1. Document Verification
                                                </h3>
                                                <div className="bg-white border rounded-lg p-4 shadow-sm space-y-4">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-slate-500">Status:</span>
                                                        {o.hr_verified ? (
                                                            <span className="text-green-600 font-bold flex items-center gap-1">
                                                                <CheckCircle className="w-3.5 h-3.5" /> Verified
                                                            </span>
                                                        ) : (
                                                            <span className="text-amber-600 font-bold flex items-center gap-1">
                                                                <Clock className="w-3.5 h-3.5" /> Pending
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <Button 
                                                        variant="outline" 
                                                        className="w-full text-xs h-9 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                                        onClick={() => handleOpenDetail(o.application_id)}
                                                    >
                                                        <Search className="w-3.5 h-3.5 mr-2" />
                                                        Review Files
                                                    </Button>

                                                    {!o.hr_verified && (
                                                        <Button 
                                                            onClick={() => handleHrVerify(o.application_id)}
                                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-9 text-xs shadow-md shadow-indigo-100"
                                                        >
                                                            Approve Documents
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* HR Joining Details Panel */}
                                            <div className="space-y-4">
                                                <h3 className="font-semibold flex items-center gap-2 text-slate-700 bg-slate-100 p-2 rounded-md">
                                                    <MapPin className="w-4 h-4 text-indigo-600" />
                                                    2. HR Joining Assignment
                                                </h3>
                                                <div className="space-y-3 bg-white border rounded-lg p-4 shadow-sm text-sm">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Reporting Time</Label>
                                                        <Input 
                                                            defaultValue={o.reporting_time || ""} 
                                                            onBlur={(e) => handleHrDetailsUpdate(o.application_id, { reporting_time: e.target.value })}
                                                            placeholder="e.g. 09:00 AM"
                                                            className="h-8"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Office Location</Label>
                                                        <Input 
                                                            defaultValue={o.office_location || ""} 
                                                            onBlur={(e) => handleHrDetailsUpdate(o.application_id, { office_location: e.target.value })}
                                                            placeholder="e.g. Floor 2, Room 204"
                                                            className="h-8"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Shift Timing</Label>
                                                        <select 
                                                            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                                                            defaultValue={o.shift_timing || "1st Shift"}
                                                            onChange={(e) => handleHrDetailsUpdate(o.application_id, { shift_timing: e.target.value })}
                                                        >
                                                            <option value="1st Shift">1st Shift</option>
                                                            <option value="2nd Shift">2nd Shift</option>
                                                            <option value="3rd Shift">3rd Shift</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* IT Setup Panel */}
                                            <div className="space-y-4">
                                                <h3 className="font-semibold flex items-center gap-2 text-slate-700 bg-slate-100 p-2 rounded-md">
                                                    <MonitorCheck className="w-4 h-4 text-emerald-600" />
                                                    3. IT Tools & Access
                                                </h3>
                                                <div className="space-y-2 bg-white border rounded-lg p-4 shadow-sm overflow-y-auto max-h-[220px]">
                                                    {[
                                                        { key: 'it_slack_setup', label: 'Slack Account' },
                                                        { key: 'it_gmail_setup', label: 'Gmail Account' },
                                                        { key: 'it_browser_extensions', label: 'Extensions' },
                                                        { key: 'it_gmail_signature', label: 'Signature' },
                                                        { key: 'it_bordio_access', label: 'Bordio' },
                                                        { key: 'it_office365_access', label: 'Office 365' }
                                                    ].map(item => (
                                                        <label key={item.key} className={`flex items-center justify-between p-1.5 rounded border cursor-pointer hover:bg-slate-50 transition-colors ${(o as any)[item.key] ? 'bg-emerald-50/50 border-emerald-100' : ''}`}>
                                                            <span className="text-xs text-slate-700">{item.label}</span>
                                                            <input 
                                                                type="checkbox" 
                                                                className="w-3.5 h-3.5 text-emerald-600 rounded"
                                                                checked={(o as any)[item.key] || false}
                                                                onChange={() => handleItSetupToggle(o.application_id, o, item.key)}
                                                                disabled={!o.hr_verified || o.status === 'COMPLETED'}
                                                            />
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Induction Section */}
                                        <div className="mt-8 pt-6 border-t border-dashed">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="bg-amber-100 p-1.5 rounded-lg text-amber-700">
                                                    <UserCheck className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900">Day 1 Induction Checklist</h3>
                                                    <p className="text-xs text-slate-500">Coordinate post-onboarding tasks with different departments</p>
                                                </div>
                                            </div>
                                            
                                            <div className="grid md:grid-cols-3 gap-6">
                                                {/* HR Induction */}
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> HR Tasks
                                                    </h4>
                                                    <div className="space-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-sm">
                                                        {[
                                                            { key: 'ind_hr_welcome_session', label: 'Welcome Session' },
                                                            { key: 'ind_hr_handbook_shared', label: 'Employee Handbook' },
                                                            { key: 'ind_hr_policies_explained', label: 'Policies Briefing' }
                                                        ].map(item => (
                                                            <div key={item.key} className="flex items-center gap-2">
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={(o as any)[item.key] || false}
                                                                    onChange={() => handleInductionToggle(o.application_id, o, item.key, 'hr')}
                                                                    className="rounded border-slate-300"
                                                                />
                                                                <span className="text-slate-600">{item.label}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* IT Induction */}
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> IT Induction
                                                    </h4>
                                                    <div className="space-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-sm">
                                                        {[
                                                            { key: 'ind_it_credentials_provided', label: 'Provide Credentials' },
                                                            { key: 'ind_it_security_induction', label: 'Security Training' }
                                                        ].map(item => (
                                                            <div key={item.key} className="flex items-center gap-2">
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={(o as any)[item.key] || false}
                                                                    onChange={() => handleInductionToggle(o.application_id, o, item.key, 'it')}
                                                                    className="rounded border-slate-300"
                                                                />
                                                                <span className="text-slate-600">{item.label}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Manager Induction */}
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Manager/Team
                                                    </h4>
                                                    <div className="space-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-sm">
                                                        {[
                                                            { key: 'ind_manager_buddy_assigned', label: 'Assign Buddy' },
                                                            { key: 'ind_manager_team_intro', label: 'Team Intro' }
                                                        ].map(item => (
                                                            <div key={item.key} className="flex items-center gap-2">
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={(o as any)[item.key] || false}
                                                                    onChange={() => handleInductionToggle(o.application_id, o, item.key, 'manager')}
                                                                    className="rounded border-slate-300"
                                                                />
                                                                <span className="text-slate-600">{item.label}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Detailed View Modal */}
                    <AnimatePresence>
                        {selectedCandidateId && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                                >
                                    <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900">Candidate Onboarding File</h2>
                                            <p className="text-slate-500 text-sm">Full documentation and verification status</p>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedCandidateId(null)}>
                                            <XIcon className="w-5 h-5" />
                                        </Button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-8">
                                        {detailLoading ? (
                                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                                <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                                                <p className="text-slate-500 font-medium">Fetching secure records...</p>
                                            </div>
                                        ) : detailedInfo ? (
                                            <div className="space-y-8">
                                                {/* Candidate Bio Card */}
                                                <div className="grid md:grid-cols-3 gap-6 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100/50">
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Candidate Name</span>
                                                        <p className="font-bold text-slate-900 text-lg">{detailedInfo.candidate_name}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Email Address</span>
                                                        <p className="font-medium text-slate-600">{detailedInfo.email}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Job Position</span>
                                                        <p className="font-bold text-indigo-600">{detailedInfo.job_title}</p>
                                                    </div>
                                                </div>

                                                {/* Documents Section */}
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                                            <ShieldCheck className="w-5 h-5 text-indigo-600" />
                                                            Uploaded Documentation
                                                        </h3>
                                                        <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                                                            {detailedInfo.documents.length} Files Uploaded
                                                        </span>
                                                    </div>

                                                    {detailedInfo.documents.length === 0 ? (
                                                        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                                            <p className="text-slate-500 font-medium">No documents uploaded yet by the candidate.</p>
                                                        </div>
                                                    ) : (
                                                <div className="grid sm:grid-cols-2 gap-5">
                                                    {detailedInfo.documents.map((doc: any) => (
                                                        <div 
                                                            key={doc.id} 
                                                            className="p-5 border border-slate-200 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group cursor-pointer shadow-sm hover:shadow-md"
                                                            onClick={() => window.open(getDocumentViewUrl(doc.file_url) || "", "_blank")}
                                                        >
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors" title={doc.file_name}>
                                                                        {doc.file_name}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mt-2">
                                                                        <span className="text-[10px] uppercase font-black text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                                                                            {doc.file_type.toUpperCase()}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                                            Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        className="h-9 w-9 p-0 bg-blue-50 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-xl"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            window.open(getDocumentViewUrl(doc.file_url) || "", "_blank");
                                                                        }}
                                                                        title="View in New Tab"
                                                                    >
                                                                        <Search className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        className="h-9 w-9 p-0 bg-slate-100 text-slate-600 hover:text-slate-700 hover:bg-slate-200 rounded-xl"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const link = document.createElement('a');
                                                                            link.href = getDocumentViewUrl(doc.file_url) || "";
                                                                            link.download = doc.file_name;
                                                                            document.body.appendChild(link);
                                                                            link.click();
                                                                            document.body.removeChild(link);
                                                                        }}
                                                                        title="Download File"
                                                                    >
                                                                        <DownloadIcon className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-20 text-slate-400">Failed to load candidate details.</div>
                                        )}
                                    </div>

                                    <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
                                        <Button variant="outline" onClick={() => setSelectedCandidateId(null)}>Close View</Button>
                                        <Button 
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                            onClick={() => {
                                                setSelectedCandidateId(null);
                                            }}
                                        >
                                            Done
                                        </Button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

function XIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

function DownloadIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  )
}
