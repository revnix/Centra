"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  interviewSchedulesApi,
  HireRecommendation,
} from "@/lib/api/interview_schedules";
import {
  Calendar, Clock, MapPin, Video, UserCheck, Star, MessageSquare,
  CheckCircle2, Send, Loader2, Sparkles, Building2, User, Mail
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

      toast.success("Interview feedback submitted successfully!");
      setSubmittedSuccess(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDate = scheduleData?.scheduled_at
    ? new Date(scheduleData.scheduled_at).toLocaleString("en-US", {
        weekday: "long", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
      })
    : "";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-400">Loading interview details...</p>
      </div>
    );
  }

  if (error || !scheduleData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-200">Unable to Load Feedback Form</h2>
        <p className="text-sm text-slate-400 mt-2 max-w-md">{error || "The specified interview schedule was not found."}</p>
      </div>
    );
  }

  if (submittedSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Feedback Recorded!</h2>
          <p className="text-sm text-slate-400">
            Thank you for evaluating <strong className="text-slate-200">{scheduleData.candidate_name}</strong> for the <strong className="text-slate-200">{scheduleData.job_title}</strong> role.
          </p>
          <div className="pt-4 border-t border-slate-800 text-xs text-slate-500">
            Your review has been logged under <span className="font-mono text-indigo-400">{leadEmail}</span> and is now available on the HR panel.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Evalyn AI</h1>
              <p className="text-xs text-slate-400">Candidate Evaluation & Feedback Panel</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Department Lead Portal
          </span>
        </div>

        {/* Candidate & Interview Overview Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Candidate Evaluation</span>
              <h2 className="text-2xl font-extrabold text-white mt-0.5">{scheduleData.candidate_name}</h2>
              <p className="text-xs text-slate-400 font-medium">{scheduleData.job_title}</p>
            </div>
            <div className="text-right sm:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Application #{scheduleData.application_id}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2.5 text-slate-300 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Scheduled Time</p>
                <p className="font-semibold">{formattedDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-slate-300 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Duration</p>
                <p className="font-semibold">{scheduleData.duration_minutes} minutes</p>
              </div>
            </div>

            {scheduleData.location && (
              <div className="flex items-center gap-2.5 text-slate-300 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Location / Platform</p>
                  <p className="font-semibold">{scheduleData.location}</p>
                </div>
              </div>
            )}

            {scheduleData.meeting_link && (
              <div className="flex items-center gap-2.5 text-slate-300 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <Video className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Meeting URL</p>
                  <a
                    href={scheduleData.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-indigo-400 hover:underline truncate block max-w-[200px]"
                  >
                    {scheduleData.meeting_link}
                  </a>
                </div>
              </div>
            )}
          </div>

          {scheduleData.notes && (
            <div className="bg-indigo-950/30 border border-indigo-900/50 p-3.5 rounded-2xl text-xs text-indigo-200">
              <span className="font-bold text-indigo-400 block mb-0.5">Internal HR Notes:</span>
              <p className="leading-relaxed">{scheduleData.notes}</p>
            </div>
          )}
        </div>

        {/* Feedback Submission Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-400" /> Submit Interview Feedback
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Please rate the candidate across core competencies and provide your final recommendation.
            </p>
          </div>

          {/* Department Lead Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" /> Your Email Address <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="your.email@company.com"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" /> Your Name / Title
              </label>
              <input
                type="text"
                placeholder='e.g. "Sami (Engineering Lead)"'
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Ratings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
            <StarPicker label="Overall Impression" value={overallRating} onChange={setOverallRating} required />
            <StarPicker label="Technical Competency" value={technicalRating} onChange={setTechnicalRating} />
            <StarPicker label="Communication Skills" value={communicationRating} onChange={setCommunicationRating} />
            <StarPicker label="Cultural Alignment" value={cultureFitRating} onChange={setCultureFitRating} />
          </div>

          {/* Recommendation */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
              Hiring Recommendation <span className="text-rose-400">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {(["STRONG_YES", "YES", "MAYBE", "NO", "STRONG_NO"] as HireRecommendation[]).map((rec) => (
                <button
                  key={rec}
                  type="button"
                  onClick={() => setRecommendation(rec)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                    recommendation === rec
                      ? rec === "STRONG_YES" || rec === "YES"
                        ? "bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20"
                        : rec === "MAYBE"
                        ? "bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/20"
                        : "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/20"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  {rec.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Qualitative Feedback */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Candidate Strengths & Highlights
            </label>
            <textarea
              rows={3}
              placeholder="What impressed you about this candidate?"
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Areas of Concern / Skill Gaps
            </label>
            <textarea
              rows={3}
              placeholder="Any red flags, weaknesses, or areas needing improvement?"
              value={concerns}
              onChange={(e) => setConcerns(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Additional Comments / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Any additional feedback for HR..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none leading-relaxed"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-extrabold text-sm shadow-xl shadow-indigo-500/25 transition-all disabled:opacity-60 cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Candidate Feedback
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StarPicker({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-300">
          {label} {required && <span className="text-rose-400">*</span>}
        </span>
        <span className="font-bold text-amber-400">{value}/5</span>
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 text-slate-700 hover:text-amber-400 transition-colors cursor-pointer"
          >
            <Star
              className={`w-5 h-5 ${
                star <= value ? "fill-amber-400 text-amber-400" : "text-slate-700"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
