"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  interviewSchedulesApi,
  HireRecommendation,
} from "@/lib/api/interview_schedules";
import {
  Calendar, Clock, MapPin, Video, UserCheck, Star, MessageSquare,
  CheckCircle2, Send, Loader2, Sparkles, Building2, User, Mail, Link2
} from "lucide-react";
import { toast } from "sonner";

export default function PublicInterviewFeedbackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const applicationId = params?.application_id ? Number(params.application_id) : null;
  const initialEmail = searchParams?.get("email") || "";

  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Form state
  const [leadEmail, setLeadEmail] = useState(initialEmail);
  const [reviewerName, setReviewerName] = useState("");
  const [overallRating, setOverallRating] = useState<number>(4);
  const [technicalRating, setTechnicalRating] = useState<number>(4);
  const [communicationRating, setCommunicationRating] = useState<number>(4);
  const [cultureFitRating, setCultureFitRating] = useState<number>(4);
  const [recommendation, setRecommendation] = useState<HireRecommendation>("YES");
  const [strengths, setStrengths] = useState<string>("");
  const [concerns, setConcerns] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!applicationId) {
      setError("Invalid application ID");
      setLoading(false);
      return;
    }
    const fetchPublicInfo = async () => {
      try {
        setLoading(true);
        const res = await interviewSchedulesApi.getPublicSchedule(applicationId);
        setScheduleData(res);
      } catch (err: any) {
        setError(err?.message || "Failed to load interview details. Please check the link.");
      } finally {
        setLoading(false);
      }
    };
    fetchPublicInfo();
  }, [applicationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadEmail.trim() || !leadEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      await interviewSchedulesApi.submitPublicFeedback(Number(applicationId), {
        lead_email: leadEmail.trim(),
        reviewer_name: reviewerName.trim() || undefined,
        overall_rating: overallRating,
        technical_rating: technicalRating,
        communication_rating: communicationRating,
        culture_fit_rating: cultureFitRating,
        recommendation,
        strengths: strengths.trim() || undefined,
        concerns: concerns.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Feedback submitted successfully!");
      setSubmittedSuccess(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDate = scheduleData?.scheduled_at
    ? new Date(scheduleData.scheduled_at).toLocaleString("en-US", {
        weekday: "long", month: "short", day: "numeric",
        year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "";

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-9 h-9 text-indigo-500 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">Loading interview details…</p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !scheduleData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center mb-4">
          <MessageSquare className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Could Not Load Feedback Form</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md">
          {error || "The specified interview schedule was not found."}
        </p>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (submittedSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white border border-slate-200 rounded-3xl p-10 max-w-md w-full shadow-xl space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-500">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Feedback Recorded!</h2>
          <p className="text-sm text-slate-500">
            Thank you for evaluating{" "}
            <strong className="text-slate-800">{scheduleData.candidate_name}</strong> for the{" "}
            <strong className="text-slate-800">{scheduleData.job_title}</strong> role.
          </p>
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
            Your review has been logged under{" "}
            <span className="font-mono text-indigo-600">{leadEmail}</span> and is now
            visible on the HR panel.
          </div>
        </div>
      </div>
    );
  }

  // ── Main Page ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Brand Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">Evalyn AI</h1>
              <p className="text-[11px] text-slate-500">Candidate Evaluation & Feedback Panel</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200">
            Department Lead Portal
          </span>
        </div>

        {/* ── Candidate & Schedule Overview ────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">
                Candidate Evaluation
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                {scheduleData.candidate_name}
              </h2>
              <p className="text-sm text-slate-500 font-medium">{scheduleData.job_title}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              Application #{scheduleData.application_id}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <InfoTile icon={<Calendar className="w-4 h-4 text-indigo-500" />} label="Scheduled Time" value={formattedDate} />
            <InfoTile icon={<Clock className="w-4 h-4 text-indigo-500" />} label="Duration" value={`${scheduleData.duration_minutes} minutes`} />
            {scheduleData.location && (
              <InfoTile icon={<MapPin className="w-4 h-4 text-indigo-500" />} label="Location / Platform" value={scheduleData.location} />
            )}
            {scheduleData.meeting_link && (
              <div className="flex items-start gap-3 bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                <div className="mt-0.5 shrink-0">{<Video className="w-4 h-4 text-indigo-500" />}</div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Meeting URL</p>
                  <a
                    href={scheduleData.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline font-medium text-xs truncate flex items-center gap-1"
                  >
                    <Link2 className="w-3 h-3 shrink-0" />
                    {scheduleData.meeting_link}
                  </a>
                </div>
              </div>
            )}
          </div>

          {scheduleData.notes && (
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-sm text-amber-800">
              <span className="font-bold text-amber-700 block mb-0.5 text-xs uppercase">
                Internal HR Notes for Panelists:
              </span>
              <p className="leading-relaxed text-xs">{scheduleData.notes}</p>
            </div>
          )}
        </div>

        {/* ── Feedback Form ─────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-500" /> Submit Interview Feedback
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Rate the candidate across key competencies and share your hiring recommendation.
            </p>
          </div>

          {/* Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Your Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="your.email@company.com"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Your Name / Title
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder='e.g. "Sami (Engineering Lead)"'
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Star Ratings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
            <StarPicker label="Overall Impression" value={overallRating} onChange={setOverallRating} required />
            <StarPicker label="Technical Competency" value={technicalRating} onChange={setTechnicalRating} />
            <StarPicker label="Communication Skills" value={communicationRating} onChange={setCommunicationRating} />
            <StarPicker label="Cultural Alignment" value={cultureFitRating} onChange={setCultureFitRating} />
          </div>

          {/* Recommendation */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
              Hiring Recommendation <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {(["STRONG_YES", "YES", "MAYBE", "NO", "STRONG_NO"] as HireRecommendation[]).map((rec) => {
                const active = recommendation === rec;
                const colorMap: Record<string, string> = {
                  STRONG_YES: active
                    ? "bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-200"
                    : "bg-white text-slate-500 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300",
                  YES: active
                    ? "bg-teal-500 text-white border-teal-400 shadow-md shadow-teal-200"
                    : "bg-white text-slate-500 border-slate-300 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300",
                  MAYBE: active
                    ? "bg-amber-400 text-white border-amber-300 shadow-md shadow-amber-200"
                    : "bg-white text-slate-500 border-slate-300 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300",
                  NO: active
                    ? "bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-200"
                    : "bg-white text-slate-500 border-slate-300 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300",
                  STRONG_NO: active
                    ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-200"
                    : "bg-white text-slate-500 border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300",
                };
                return (
                  <button
                    key={rec}
                    type="button"
                    onClick={() => setRecommendation(rec)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${colorMap[rec]}`}
                  >
                    {rec.replace("_", " ")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Qualitative */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Candidate Strengths & Highlights
              </label>
              <textarea
                rows={3}
                placeholder="What impressed you about this candidate?"
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 resize-none leading-relaxed transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Areas of Concern / Skill Gaps
              </label>
              <textarea
                rows={3}
                placeholder="Any red flags, weaknesses, or gaps you noticed?"
                value={concerns}
                onChange={(e) => setConcerns(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 resize-none leading-relaxed transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Additional Comments for HR
              </label>
              <textarea
                rows={2}
                placeholder="Any other feedback for the hiring team…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 resize-none leading-relaxed transition-all"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              Your feedback is confidential and visible only to the HR team.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-extrabold text-sm shadow-lg shadow-indigo-200 transition-all disabled:opacity-60 cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Feedback
            </button>
          </div>
        </form>

        <p className="text-center text-[11px] text-slate-400 pb-6">
          Powered by <span className="font-semibold text-indigo-500">Evalyn AI</span> · Candidate Evaluation System
        </p>
      </div>
    </div>
  );
}

// ── Sub-component: InfoTile ───────────────────────────────────────────────────
function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">{label}</p>
        <p className="text-xs font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

// ── Sub-component: StarPicker ─────────────────────────────────────────────────
function StarPicker({
  label, value, onChange, required,
}: { label: string; value: number; onChange: (v: number) => void; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-600">
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
        <span className="font-bold text-amber-500">{value}/5</span>
      </div>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 transition-transform hover:scale-110 cursor-pointer"
          >
            <Star
              className={`w-5 h-5 transition-colors ${
                star <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
