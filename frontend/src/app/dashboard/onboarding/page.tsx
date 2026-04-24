"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { onboardingApi, OnboardingResponse, getDocumentViewUrl } from "@/lib/api/onboarding";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Search, Clock, ShieldCheck, MonitorCheck, MapPin, UserCheck, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminOnboardingDashboard() {
    const [onboardings, setOnboardings] = useState<OnboardingResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/10 rounded-full -ml-10 -mb-10 blur-2xl"></div>
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
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-lg">Application #{o.application_id} (User #{o.user_id})</CardTitle>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium tracking-wide border border-blue-200">
                                                {o.status}
                                            </span>
                                            {o.joining_date && (
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Joining: {new Date(o.joining_date).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {/* HR Verification Panel */}
                                    <div className="space-y-4">
                                        <h3 className="font-semibold flex items-center gap-2 text-slate-700 bg-slate-100 p-2 rounded-md">
                                            <ShieldCheck className="w-4 h-4 text-purple-600" />
                                            1. HR Document Verification
                                        </h3>
                                        <div className="space-y-2 text-sm bg-white border rounded-lg p-4 shadow-sm">
                                            <div className="flex justify-between items-center py-1 border-b">
                                                <span className="text-slate-600">Front Picture:</span>
                                                {o.doc_front_picture_url ? (
                                                    <a href={getDocumentViewUrl(o.doc_front_picture_url) || "#"} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[150px]">
                                                        View File
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 italic">Pending</span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center py-1 border-b">
                                                <span className="text-slate-600">ID Card (CNIC):</span>
                                                {o.doc_id_card_url ? (
                                                    <a href={getDocumentViewUrl(o.doc_id_card_url) || "#"} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[150px]">
                                                        View File
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 italic">Pending</span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center py-1 border-b">
                                                <span className="text-slate-600">Educational Docs:</span>
                                                {o.doc_educational_documents_url ? (
                                                    <a href={getDocumentViewUrl(o.doc_educational_documents_url) || "#"} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[150px]">
                                                        View File
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 italic">Pending</span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center py-1 border-b">
                                                <span className="text-slate-600">Police Clearance:</span>
                                                {o.doc_police_clearance_url ? (
                                                    <a href={getDocumentViewUrl(o.doc_police_clearance_url) || "#"} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[150px]">
                                                        View File
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 italic">Pending</span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center py-1 border-b">
                                                <span className="text-slate-600">Experience Letter:</span>
                                                {o.doc_experience_letter_url ? (
                                                    <a href={getDocumentViewUrl(o.doc_experience_letter_url) || "#"} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[150px]">
                                                        View File
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 italic">Pending</span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center py-1 border-b">
                                                <span className="text-slate-600">Last Salary Slip:</span>
                                                {o.doc_salary_slip_url ? (
                                                    <a href={getDocumentViewUrl(o.doc_salary_slip_url) || "#"} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[150px]">
                                                        View File
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 italic">Pending</span>
                                                )}
                                            </div>
                                            
                                            <div className="pt-4">
                                                {o.hr_verified ? (
                                                    <div className="flex items-center gap-2 text-green-600 font-medium">
                                                        <CheckCircle className="w-4 h-4" /> HR Verified
                                                    </div>
                                                ) : (
                                                    <Button 
                                                        disabled={!o.doc_front_picture_url || !o.doc_id_card_url}
                                                        onClick={() => handleHrVerify(o.application_id)}
                                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                                                    >
                                                        Verify Documents
                                                    </Button>
                                                )}
                                            </div>
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
        </div>
    )}
</div>
    );
}
