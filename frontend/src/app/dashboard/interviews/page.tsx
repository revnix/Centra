"use client";

import { useState, useEffect } from "react";
import {
  interviewSchedulesApi,
  InterviewScheduleResponse,
  FeedbackResponse,
  ScheduleStatus,
  HireRecommendation,
} from "@/lib/api/interview_schedules";
import { applicationsApi } from "@/lib/api/applications";
import { jobsApi } from "@/lib/api/jobs";
import { gmailApi } from "@/lib/api/gmail";
import {
  Calendar, Clock, MapPin, Video, UserCheck, Plus, CheckCircle2,
  XCircle, AlertCircle, Star, MessageSquare, Edit3, Trash2, ExternalLink,
  ChevronRight, Users, Loader2, Sparkles, Filter, X, Send, Mail, ChevronDown, CheckSquare, Square
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function InterviewSchedulesPage() {
  const [activeTab, setActiveTab] = useState<"my" | "all">("my");
  const [loading, setLoading] = useState(true);
  const [mySchedules, setMySchedules] = useState<InterviewScheduleResponse[]>([]);
  const [allApplications, setAllApplications] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ label: string; email: string }[]>([]);

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<InterviewScheduleResponse | null>(null);

  const [feedbackModalSchedule, setFeedbackModalSchedule] = useState<InterviewScheduleResponse | null>(null);
  const [viewFeedbackSchedule, setViewFeedbackSchedule] = useState<InterviewScheduleResponse | null>(null);

  // Candidate Email Compose Modal State
  const [emailCandidateModalTarget, setEmailCandidateModalTarget] = useState<{ app: any; schedule: InterviewScheduleResponse } | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailFromAlias, setEmailFromAlias] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [gmailAliases, setGmailAliases] = useState<{ email: string; formatted: string; is_default?: boolean }[]>([]);

  // Form states - Schedule
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [location, setLocation] = useState<string>("");
  const [meetingLink, setMeetingLink] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [selectedLeadEmails, setSelectedLeadEmails] = useState<string[]>([]);
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  // Form states - Feedback
  const [overallRating, setOverallRating] = useState<number>(4);
  const [technicalRating, setTechnicalRating] = useState<number>(4);
  const [communicationRating, setCommunicationRating] = useState<number>(4);
  const [cultureFitRating, setCultureFitRating] = useState<number>(4);
  const [recommendation, setRecommendation] = useState<HireRecommendation>("YES");
  const [strengths, setStrengths] = useState<string>("");
  const [concerns, setConcerns] = useState<string>("");
  const [feedbackNotes, setFeedbackNotes] = useState<string>("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [myRes, appsRes, membersRes, aliasesRes] = await Promise.all([
        interviewSchedulesApi.getMyInterviews().catch(() => []),
        applicationsApi.list().catch(() => []),
        jobsApi.getTeamMembers().catch(() => []),
        gmailApi.getAliases().catch(() => ({ aliases: [] })),
      ]);
      setMySchedules(myRes || []);
      setAllApplications(appsRes || []);
      setTeamMembers(membersRes || []);
      setGmailAliases(aliasesRes?.aliases || []);
      if (aliasesRes?.aliases?.length) {
        const def = aliasesRes.aliases.find(a => a.is_default);
        setEmailFromAlias(def ? def.email : aliasesRes.aliases[0].email);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load interview schedules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetScheduleForm = () => {
    setSelectedAppId("");
    setScheduledAt("");
    setDurationMinutes(60);
    setLocation("");
    setMeetingLink("");
    setNotes("");
    setSelectedLeadEmails([]);
    setEditingSchedule(null);
  };

  const handleOpenScheduleModal = (scheduleToEdit?: InterviewScheduleResponse) => {
    if (scheduleToEdit) {
      setEditingSchedule(scheduleToEdit);
      setSelectedAppId(scheduleToEdit.application_id.toString());
      const dt = new Date(scheduleToEdit.scheduled_at);
      const localIso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setScheduledAt(localIso);
      setDurationMinutes(scheduleToEdit.duration_minutes || 60);
      setLocation(scheduleToEdit.location || "");
      setMeetingLink(scheduleToEdit.meeting_link || "");
      setNotes(scheduleToEdit.notes || "");
    } else {
      resetScheduleForm();
    }
    setIsScheduleModalOpen(true);
  };

  const toggleLeadSelection = (email: string) => {
    setSelectedLeadEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleSubmitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) {
      toast.error("Please select a candidate application.");
      return;
    }
    if (!scheduledAt) {
      toast.error("Please specify a valid date and time.");
      return;
    }

    setSubmittingSchedule(true);
    try {
      const isoDate = new Date(scheduledAt).toISOString();
      const targetApp = allApplications.find(a => a.id.toString() === selectedAppId.toString());
      const candidateName = targetApp?.candidate?.full_name || targetApp?.candidate?.email || "Candidate";
      const jobTitle = targetApp?.job?.title || "Position";

      let createdSchedule: InterviewScheduleResponse;

      if (editingSchedule) {
        createdSchedule = await interviewSchedulesApi.updateSchedule(editingSchedule.application_id, {
          scheduled_at: isoDate,
          duration_minutes: durationMinutes,
          location: location || undefined,
          meeting_link: meetingLink || undefined,
          notes: notes || undefined,
          notify_candidate: false,
        });
        toast.success("Interview schedule updated successfully!");
      } else {
        createdSchedule = await interviewSchedulesApi.createSchedule(Number(selectedAppId), {
          scheduled_at: isoDate,
          duration_minutes: durationMinutes,
          location: location || undefined,
          meeting_link: meetingLink || undefined,
          notes: notes || undefined,
          notify_candidate: false,
        });
        toast.success("Interview event created successfully!");
      }

      // Notify selected Department Leads via email
      if (selectedLeadEmails.length > 0) {
        const formattedDt = new Date(scheduledAt).toLocaleString("en-US", {
          weekday: "long", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
        });
        const leadSubject = `[Interview Assignment] ${candidateName} - ${jobTitle}`;
        const leadBody = `Hello Team Lead,\n\nYou have been assigned to conduct an interview for the candidate:\n\nCandidate: ${candidateName}\nJob Title: ${jobTitle}\nDate & Time: ${formattedDt}\nDuration: ${durationMinutes} minutes\nLocation / Platform: ${location || "To be confirmed"}\nMeeting Link: ${meetingLink || "N/A"}\n\nInternal Notes:\n${notes || "None"}\n\nAfter completing the interview, submit your candidate feedback directly using this link (no login required):\n${window.location.origin}/interview-feedback/${selectedAppId}\n\nThank you!`;

        try {
          const res = await interviewSchedulesApi.notifyLeads(Number(selectedAppId), {
            lead_emails: selectedLeadEmails,
            subject: leadSubject,
            message: leadBody,
          });
          toast.success(`Interview notifications sent to ${res.sent_count} Department Lead(s)!`);
        } catch {
          toast.error("Failed to notify some department leads.");
        }
      }

      setIsScheduleModalOpen(false);
      resetScheduleForm();
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save interview schedule.");
    } finally {
      setSubmittingSchedule(false);
    }
  };

  const handleOpenCandidateEmailModal = (app: any, schedule: InterviewScheduleResponse) => {
    const candidateName = app?.candidate?.full_name || app?.candidate?.email || "Candidate";
    const jobTitle = app?.job?.title || "the position";
    const formattedDt = new Date(schedule.scheduled_at).toLocaleString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
    });

    const defaultSubject = `Interview Scheduled – ${jobTitle}`;
    const defaultBody = `Dear ${candidateName},\n\nWe are pleased to confirm your upcoming interview for the ${jobTitle} position.\n\nInterview Details:\n• Date & Time: ${formattedDt}\n• Duration: ${schedule.duration_minutes} minutes\n• Location / Platform: ${schedule.location || "Online"}\n• Meeting Link: ${schedule.meeting_link || "Will be shared shortly"}\n\n${schedule.notes ? `Special Instructions / Notes:\n${schedule.notes}\n\n` : ""}Please let us know if you have any questions or need to reschedule.\n\nBest regards,\nRecruitment Team\nEvalyn AI`;

    setEmailSubject(defaultSubject);
    setEmailBody(defaultBody);
    setEmailCandidateModalTarget({ app, schedule });
  };

  const handleSendCandidateEmail = async () => {
    if (!emailCandidateModalTarget) return;
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error("Subject and message body are required.");
      return;
    }

    setIsSendingEmail(true);
    try {
      const formData = new FormData();
      formData.append("subject", emailSubject.trim());
      formData.append("message", emailBody.trim());
      if (emailFromAlias) formData.append("from_email", emailFromAlias);

      await applicationsApi.sendEmail(emailCandidateModalTarget.app.id.toString(), formData);
      toast.success("Interview email sent to candidate successfully!");
      setEmailCandidateModalTarget(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to send candidate email.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCancelSchedule = async (appId: number) => {
    if (!confirm("Are you sure you want to cancel this interview schedule?")) return;
    try {
      await interviewSchedulesApi.cancelSchedule(appId);
      toast.success("Interview schedule cancelled.");
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel interview.");
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackModalSchedule) return;

    setSubmittingFeedback(true);
    try {
      await interviewSchedulesApi.submitFeedback(feedbackModalSchedule.application_id, {
        overall_rating: overallRating,
        technical_rating: technicalRating,
        communication_rating: communicationRating,
        culture_fit_rating: cultureFitRating,
        recommendation,
        strengths: strengths.trim() || undefined,
        concerns: concerns.trim() || undefined,
        notes: feedbackNotes.trim() || undefined,
      });

      toast.success("Feedback submitted successfully!");
      setFeedbackModalSchedule(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit feedback.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const scheduledApps = allApplications.filter((app) => app.interview_schedule != null);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Interview Scheduling & Panel</h1>
          </div>
          <p className="text-sm text-slate-500 ml-[52px]">
            Schedule human interviews, assign department leads, dispatch candidate invites with custom templates, and collect structured feedback.
          </p>
        </div>
        <button
          onClick={() => handleOpenScheduleModal()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-bold shadow-lg shadow-indigo-200 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Schedule Interview
        </button>
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("my")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "my"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <UserCheck className="w-4 h-4" /> My Upcoming Interviews ({mySchedules.length})
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "all"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Users className="w-4 h-4" /> All Scheduled Interviews ({scheduledApps.length})
        </button>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading interview schedules...</p>
        </div>
      ) : activeTab === "my" ? (
        mySchedules.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center">
            <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-slate-700 font-bold text-lg">No assigned interviews found</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
              You are not currently assigned as a lead for any upcoming interviews.
            </p>
            <button
              onClick={() => handleOpenScheduleModal()}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all"
            >
              <Plus className="w-4 h-4" /> Schedule New Interview
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mySchedules.map((schedule) => {
              const app = allApplications.find((a) => a.id === schedule.application_id);
              return (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  app={app}
                  onEdit={() => handleOpenScheduleModal(schedule)}
                  onCancel={() => handleCancelSchedule(schedule.application_id)}
                  onFeedback={() => setFeedbackModalSchedule(schedule)}
                  onViewFeedback={() => setViewFeedbackSchedule(schedule)}
                  onEmailCandidate={() => app && handleOpenCandidateEmailModal(app, schedule)}
                />
              );
            })}
          </div>
        )
      ) : (
        scheduledApps.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center">
            <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-slate-700 font-bold text-lg">No interviews scheduled yet</h3>
            <p className="text-slate-400 text-sm mt-1">
              Select an application and schedule a human panel interview to get started.
            </p>
            <button
              onClick={() => handleOpenScheduleModal()}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all"
            >
              <Plus className="w-4 h-4" /> Schedule First Interview
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scheduledApps.map((app) => (
              <ScheduleCard
                key={app.id}
                schedule={app.interview_schedule}
                app={app}
                onEdit={() => handleOpenScheduleModal(app.interview_schedule)}
                onCancel={() => handleCancelSchedule(app.id)}
                onFeedback={() => setFeedbackModalSchedule(app.interview_schedule)}
                onViewFeedback={() => setViewFeedbackSchedule(app.interview_schedule)}
                onEmailCandidate={() => handleOpenCandidateEmailModal(app, app.interview_schedule)}
              />
            ))}
          </div>
        )
      )}

      {/* ── MODAL: Schedule / Edit Interview ────────────────────────────── */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-extrabold text-slate-900">
                  {editingSchedule ? "Edit Interview Schedule" : "Schedule New Interview"}
                </h3>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSchedule} className="space-y-4">
              {/* Candidate Application Selector */}
              {!editingSchedule ? (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Candidate Application <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedAppId}
                    onChange={(e) => setSelectedAppId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="">— Select Candidate —</option>
                    {allApplications.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.candidate?.full_name || app.candidate?.email || `App #${app.id}`} — {app.job?.title || "Role"} ({app.status})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bg-indigo-50/60 border border-indigo-100 p-3 rounded-xl text-xs text-indigo-900 font-bold">
                  Editing Interview for Application #{editingSchedule.application_id}
                </div>
              )}

              {/* Date & Time */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Interview Date & Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Duration (Minutes)
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes (1 hour)</option>
                  <option value={90}>90 minutes (1.5 hours)</option>
                  <option value={120}>120 minutes (2 hours)</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Location / Platform
                </label>
                <input
                  type="text"
                  placeholder='e.g. "Google Meet" or "Office Room 3"'
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              {/* Video Call Link */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Meeting Link (URL)
                </label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Internal HR Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes for panel members..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
                />
              </div>

              {/* Department Leads / Panel Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" /> Assign Department Leads & Notify
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Select department leads. They will receive interview details & direct link to log candidate feedback.
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 max-h-40 overflow-y-auto space-y-2">
                  {teamMembers.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No team leads configured</p>
                  ) : (
                    teamMembers.map((member) => {
                      const isSelected = selectedLeadEmails.includes(member.email);
                      return (
                        <div
                          key={member.email}
                          onClick={() => toggleLeadSelection(member.email)}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer border transition-all ${
                            isSelected
                              ? "bg-indigo-50/80 border-indigo-200 text-indigo-900 font-bold"
                              : "bg-white border-slate-100 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div>
                            <span className="block font-bold">{member.label}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{member.email}</span>
                          </div>
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-5">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSchedule}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-60"
                >
                  {submittingSchedule && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingSchedule ? "Save Changes" : "Confirm Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Email Candidate with Template & Gmail Aliases ─────────── */}
      {emailCandidateModalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <Mail className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-extrabold text-slate-900">
                  Send Candidate Interview Email
                </h3>
              </div>
              <button
                onClick={() => setEmailCandidateModalTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* To info */}
              <div className="text-xs text-slate-500 font-medium">
                To: <span className="font-bold text-slate-800">{emailCandidateModalTarget.app?.candidate?.full_name}</span> &lt;{emailCandidateModalTarget.app?.candidate?.email}&gt;
              </div>

              {/* From Gmail Alias Selector */}
              {gmailAliases.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">From Email Alias</label>
                  <div className="relative">
                    <select
                      value={emailFromAlias}
                      onChange={(e) => setEmailFromAlias(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none pr-8 font-mono"
                    >
                      {gmailAliases.map((a) => (
                        <option key={a.email} value={a.email}>
                          {a.formatted || a.email}{a.is_default ? " (default)" : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-medium"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Message Body (Template)</label>
                <textarea
                  rows={9}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono resize-none leading-relaxed"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEmailCandidateModalTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  disabled={isSendingEmail}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendCandidateEmail}
                  disabled={isSendingEmail}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-60"
                >
                  {isSendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Submit Post-Interview Feedback ────────────────────────── */}
      {feedbackModalSchedule && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-extrabold text-slate-900">
                  Submit Interview Feedback
                </h3>
              </div>
              <button
                onClick={() => setFeedbackModalSchedule(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-5">
              {/* Ratings Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <StarRatingPicker label="Overall Rating" value={overallRating} onChange={setOverallRating} required />
                <StarRatingPicker label="Technical Rating" value={technicalRating} onChange={setTechnicalRating} />
                <StarRatingPicker label="Communication" value={communicationRating} onChange={setCommunicationRating} />
                <StarRatingPicker label="Cultural Fit" value={cultureFitRating} onChange={setCultureFitRating} />
              </div>

              {/* Recommendation */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                  Hiring Recommendation <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(["STRONG_YES", "YES", "MAYBE", "NO", "STRONG_NO"] as HireRecommendation[]).map((rec) => (
                    <button
                      key={rec}
                      type="button"
                      onClick={() => setRecommendation(rec)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
                        recommendation === rec
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {rec.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Strengths */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Candidate Strengths
                </label>
                <textarea
                  rows={2}
                  placeholder="Key strengths observed during the interview..."
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
                />
              </div>

              {/* Concerns */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Areas of Concern / Gaps
                </label>
                <textarea
                  rows={2}
                  placeholder="Concerns or skill gaps noted..."
                  value={concerns}
                  onChange={(e) => setConcerns(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Additional Panel Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Any final notes or observations..."
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setFeedbackModalSchedule(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-60"
                >
                  {submittingFeedback && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: View Submitted Feedback ──────────────────────────────── */}
      {viewFeedbackSchedule && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <h3 className="text-lg font-extrabold text-slate-900">
                  Panel Feedback Entries ({viewFeedbackSchedule.feedback_entries?.length || 0})
                </h3>
              </div>
              <button
                onClick={() => setViewFeedbackSchedule(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(!viewFeedbackSchedule.feedback_entries || viewFeedbackSchedule.feedback_entries.length === 0) ? (
              <p className="text-slate-500 text-xs py-8 text-center">No feedback entries submitted yet.</p>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {viewFeedbackSchedule.feedback_entries.map((fb) => (
                  <div key={fb.id} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex flex-col">
                          <span className="text-xs font-extrabold text-slate-800">
                            {fb.panelist_full_name || "Department Lead"}
                          </span>
                          {fb.panelist_email && (
                            <span className="text-[11px] font-mono text-indigo-600 font-semibold">
                              {fb.panelist_email}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Submitted: {fb.submitted_at ? new Date(fb.submitted_at).toLocaleString() : "Just now"}
                        </p>
                      </div>
                      {getRecBadge(fb.recommendation)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
                      <div><span className="text-slate-400">Overall:</span> <span className="font-bold text-amber-600">{fb.overall_rating}/5 ★</span></div>
                      {fb.technical_rating != null && <div><span className="text-slate-400">Technical:</span> <span className="font-bold text-slate-700">{fb.technical_rating}/5</span></div>}
                      {fb.communication_rating != null && <div><span className="text-slate-400">Communication:</span> <span className="font-bold text-slate-700">{fb.communication_rating}/5</span></div>}
                      {fb.culture_fit_rating != null && <div><span className="text-slate-400">Culture Fit:</span> <span className="font-bold text-slate-700">{fb.culture_fit_rating}/5</span></div>}
                    </div>

                    {fb.strengths && (
                      <div className="text-xs bg-white p-2.5 rounded-xl border border-slate-100">
                        <strong className="text-emerald-700 block mb-0.5">Strengths:</strong>
                        <p className="text-slate-600 leading-relaxed">{fb.strengths}</p>
                      </div>
                    )}
                    {fb.concerns && (
                      <div className="text-xs bg-white p-2.5 rounded-xl border border-slate-100">
                        <strong className="text-rose-700 block mb-0.5">Concerns:</strong>
                        <p className="text-slate-600 leading-relaxed">{fb.concerns}</p>
                      </div>
                    )}
                    {fb.notes && (
                      <div className="text-xs bg-white p-2.5 rounded-xl border border-slate-100">
                        <strong className="text-slate-700 block mb-0.5">Notes:</strong>
                        <p className="text-slate-600 leading-relaxed">{fb.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

function StarRatingPicker({ label, value, onChange, required }: { label: string; value: number; onChange: (v: number) => void; required?: boolean }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 hover:scale-110 transition-transform focus:outline-none"
          >
            <Star
              className={`w-5 h-5 ${
                star <= value ? "text-amber-500 fill-amber-500" : "text-slate-300"
              }`}
            />
          </button>
        ))}
        <span className="text-xs font-bold text-slate-600 ml-1">{value}/5</span>
      </div>
    </div>
  );
}

function ScheduleCard({
  schedule,
  app,
  onEdit,
  onCancel,
  onFeedback,
  onViewFeedback,
  onEmailCandidate,
}: {
  schedule: InterviewScheduleResponse;
  app?: any;
  onEdit: () => void;
  onCancel: () => void;
  onFeedback: () => void;
  onViewFeedback: () => void;
  onEmailCandidate: () => void;
}) {
  const dt = new Date(schedule.scheduled_at);
  const formattedDate = dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const formattedTime = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const getStatusBadge = (status: ScheduleStatus) => {
    switch (status) {
      case "COMPLETED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</span>;
      case "CANCELLED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200"><XCircle className="w-3.5 h-3.5" /> Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200"><Clock className="w-3.5 h-3.5" /> Scheduled</span>;
    }
  };

  const candidateName = app?.candidate?.full_name || app?.candidate?.email || `Application #${schedule.application_id}`;
  const jobTitle = app?.job?.title || "Role";

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              {jobTitle}
            </span>
            <h3 className="font-extrabold text-slate-900 text-base mt-1">{candidateName}</h3>
          </div>
          {getStatusBadge(schedule.status)}
        </div>

        {/* Date & Time info */}
        <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Calendar className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
            {formattedDate} @ {formattedTime} ({schedule.duration_minutes}m)
          </div>
          {schedule.location && (
            <div className="flex items-center gap-2 text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              {schedule.location}
            </div>
          )}
          {schedule.meeting_link && (
            <div className="flex items-center gap-2 pt-0.5">
              <Video className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              <a
                href={schedule.meeting_link}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 font-bold hover:underline flex items-center gap-1 truncate"
              >
                Join Meeting Link <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {schedule.notes && (
          <p className="text-xs text-slate-500 mt-3 italic line-clamp-2">"{schedule.notes}"</p>
        )}

        {/* Panelists & Feedback summary */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            {schedule.panelists?.length || 0} Panelist{(schedule.panelists?.length || 0) !== 1 ? "s" : ""}
          </span>
          <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
            {schedule.feedback_submitted_count} / {schedule.panelist_count || schedule.panelists?.length || 0} Feedback
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
            title="Edit Schedule"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Cancel Interview"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {app && (
            <button
              onClick={onEmailCandidate}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-xs font-bold transition-all border border-slate-200"
              title="Email Candidate"
            >
              <Mail className="w-3.5 h-3.5 text-indigo-600" /> Email Candidate
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {schedule.feedback_submitted_count > 0 && (
            <button
              onClick={onViewFeedback}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
            >
              Reviews ({schedule.feedback_submitted_count})
            </button>
          )}
          {schedule.status !== "CANCELLED" && (
            <button
              onClick={onFeedback}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Feedback
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function getRecBadge(rec: HireRecommendation) {
  switch (rec) {
    case "STRONG_YES":
      return <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold">Strong Yes</span>;
    case "YES":
      return <span className="px-2.5 py-1 rounded-lg bg-teal-100 text-teal-800 text-xs font-bold">Yes</span>;
    case "MAYBE":
      return <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold">Maybe</span>;
    case "NO":
      return <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 text-xs font-bold">No</span>;
    case "STRONG_NO":
      return <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-extrabold">Strong No</span>;
  }
}
