"use client";

import { useState, useEffect } from "react";
import { candidatesApi, PooledCandidate } from "@/lib/api/candidates";
import { jobsApi } from "@/lib/api/jobs";
import {
  DatabaseZap, Search, X, Plus, Loader2, Star, MapPin,
  GraduationCap, Briefcase, Phone, FileText, Users,
  Sparkles, SlidersHorizontal, Clock, CheckCircle, Eye,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
const EDUCATION_OPTIONS = ["Any", "Matric", "Intermediate", "Bachelor", "Master", "PhD"];
const TIMEFRAME_OPTIONS = [
  { label: "All Time", value: 0 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
  { label: "Last 365 days", value: 365 },
];

function ScoreBadge({ score }: { score?: number }) {
  if (score == null) return null;
  const pct = Math.round(score);
  const color =
    pct >= 80 ? "from-emerald-500 to-teal-500" :
    pct >= 60 ? "from-blue-500 to-indigo-500" :
                "from-amber-500 to-orange-500";
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}
      >
        <span className="text-white font-black text-lg">{pct}</span>
      </div>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Match</span>
    </div>
  );
}

function SkillTag({ skill }: { skill: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[0.7rem] font-bold border border-indigo-100">
      {skill}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────────
export default function ResumePoolingPage() {
  // ── Jobs for dropdown ───────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");

  useEffect(() => {
    jobsApi.getAll().then(j => setJobs(j.map(x => ({ id: x.id, title: x.title })))).catch(() => {});
  }, []);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [jobTitle, setJobTitle] = useState("");
  const [description, setDescription] = useState("");
  const [education, setEducation] = useState("Any");
  const [experienceYears, setExperienceYears] = useState<number | "">("");
  const [areaOfLiving, setAreaOfLiving] = useState("");
  const [appliedWithinDays, setAppliedWithinDays] = useState(0);
  const [minScore, setMinScore] = useState(0);
  const [limit, setLimit] = useState(15);
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);

  // ── Results state ────────────────────────────────────────────────────────────
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<PooledCandidate[] | null>(null);
  const [querySummary, setQuerySummary] = useState("");
  const [totalFound, setTotalFound] = useState(0);

  // ── Skills helpers ───────────────────────────────────────────────────────────
  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
    }
    setSkillInput("");
  };
  const removeSkill = (s: string) => setSkills((prev) => prev.filter((x) => x !== s));

  // ── Search ───────────────────────────────────────────────────────────────────
  const handleSearch = async () => {
    setIsSearching(true);
    setResults(null);
    try {
      const payload: Parameters<typeof candidatesApi.resumePooling>[0] = {
        limit: limit || 15,
        min_score: minScore || 0,
      };
      if (jobTitle.trim())      payload.job_title         = jobTitle.trim();
      if (skills.length)        payload.skills            = skills;
      if (description.trim())   payload.description       = description.trim();
      if (education !== "Any")  payload.education         = education;
      if (experienceYears !== "") payload.experience_years = Number(experienceYears);
      if (areaOfLiving.trim())  payload.area_of_living    = areaOfLiving.trim();
      if (appliedWithinDays > 0) payload.applied_within_days = appliedWithinDays;

      const res = await candidatesApi.resumePooling(payload);
      setResults(res.candidates ?? []);
      setQuerySummary(res.query_summary ?? "");
      setTotalFound(res.total_found ?? 0);

      if (!res.candidates?.length) {
        toast.info("No matching candidates found. Try broadening your criteria.");
      } else {
        toast.success(`Found ${res.returned_count} matching candidate(s) out of ${res.total_found} in the pool.`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Resume Pooling search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setJobTitle(""); setDescription(""); setEducation("Any");
    setExperienceYears(""); setAreaOfLiving(""); setAppliedWithinDays(0);
    setMinScore(0); setLimit(15); setSkills([]); setSkillInput("");
    setResults(null); setQuerySummary(""); setTotalFound(0); setSelectedJobId("");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <DatabaseZap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Resume Pooling</h1>
          </div>
          <p className="text-sm text-slate-500 ml-[52px]">
            Rediscover previously rejected or waitlisted candidates from the database using AI matching.
          </p>
        </div>
        {results !== null && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-violet-50 border border-violet-200 text-violet-700 text-sm font-bold">
            <Users className="w-4 h-4" />
            {totalFound} candidate{totalFound !== 1 ? "s" : ""} in pool
          </div>
        )}
      </div>

      {/* ── Search Form Card ──────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">

        {/* Card header */}
        <div className="flex items-center gap-3 px-7 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <SlidersHorizontal className="w-5 h-5 text-indigo-500" />
          <h2 className="text-base font-bold text-slate-800">Search Criteria</h2>
          <span className="ml-auto text-xs text-slate-400 font-medium">All fields are optional — more filters = better matches</span>
        </div>

        <div className="p-7 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

          {/* Job to Shortlist For — required for Shortlist action */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-rose-400" /> Shortlist For Job <span className="text-rose-500">*</span>
            </label>
            <select
              id="rp-job-select"
              value={selectedJobId}
              onChange={(e) => { setSelectedJobId(e.target.value); setJobTitle(jobs.find(j => j.id === e.target.value)?.title || ""); }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            >
              <option value="">— Select a Job —</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>

          {/* Job Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-indigo-400" /> Job Title / AI Search Term
            </label>
            <input
              id="rp-job-title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Full Stack Developer"
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            />
          </div>

          {/* Education */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> Min. Education
            </label>
            <select
              id="rp-education"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            >
              {EDUCATION_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Experience Years */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-indigo-400" /> Min. Experience (yrs)
            </label>
            <input
              id="rp-experience"
              type="number"
              min={0}
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g. 2"
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            />
          </div>

          {/* Area of Living */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Area / City
            </label>
            <input
              id="rp-area"
              value={areaOfLiving}
              onChange={(e) => setAreaOfLiving(e.target.value)}
              placeholder="e.g. Islamabad, Haripur"
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            />
          </div>

          {/* Applied Within */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" /> Applied Within
            </label>
            <select
              id="rp-timeframe"
              value={appliedWithinDays}
              onChange={(e) => setAppliedWithinDays(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            >
              {TIMEFRAME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Limit */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" /> Max Results
            </label>
            <input
              id="rp-limit"
              type="number"
              min={1}
              max={100}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            />
          </div>

          {/* Skills — full width */}
          <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Required Skills
            </label>
            <div className="flex items-center gap-2">
              <input
                id="rp-skill-input"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                placeholder="Type a skill and press Enter or +"
                className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
              />
              <button
                type="button"
                onClick={addSkill}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200"
                  >
                    {s}
                    <button type="button" onClick={() => removeSkill(s)} className="hover:text-rose-600 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Job Description — full width */}
          <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" /> Job Description / Requirements
            </label>
            <textarea
              id="rp-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste the full job description or key requirements here for more accurate AI matching..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-7 py-5 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={handleReset}
            className="text-sm font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <X className="w-4 h-4" /> Reset Filters
          </button>
          <button
            id="rp-search-btn"
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="flex items-center gap-2.5 px-7 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSearching ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Searching Pool...</>
            ) : (
              <><Search className="w-4 h-4" /> Search Resume Pool</>
            )}
          </button>
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────────────── */}
      {results !== null && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-400">

          {/* Results header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {results.length === 0 ? "No matches found" : `${results.length} Best Match${results.length !== 1 ? "es" : ""}`}
              </h2>
              {querySummary && (
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> {querySummary}
                </p>
              )}
            </div>
          </div>

          {results.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center">
              <DatabaseZap className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-semibold">No candidates matched your criteria.</p>
              <p className="text-slate-400 text-sm mt-1">Try removing some filters or broadening your skill requirements.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {results.map((candidate, i) => (
                <CandidateCard key={candidate.user_id ?? i} candidate={candidate} rank={i + 1} selectedJobId={selectedJobId} />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Candidate Result Card
// ──────────────────────────────────────────────────────────────────────────────
function CandidateCard({ candidate, rank, selectedJobId }: { candidate: PooledCandidate; rank: number; selectedJobId: string }) {
  const initials = candidate.full_name?.slice(0, 2).toUpperCase() || "??";
  const score = candidate.match_score;
  const [shortlisted, setShortlisted] = useState(false);
  const [isShortlisting, setIsShortlisting] = useState(false);

  const scoreColor =
    score != null && score >= 80 ? "from-emerald-500 to-teal-500" :
    score != null && score >= 60 ? "from-blue-500 to-indigo-500" :
                                   "from-amber-500 to-orange-500";

  const handleViewResume = () => {
    if (candidate.resume_url) window.open(candidate.resume_url, "_blank");
    else toast.info("No resume URL available for this candidate.");
  };

  const handleShortlist = async () => {
    if (!selectedJobId) { toast.error("Please select a job first from the 'Shortlist For Job' dropdown."); return; }
    if (shortlisted) return;
    setIsShortlisting(true);
    try {
      await candidatesApi.poolShortlist(candidate.user_id, Number(selectedJobId));
      setShortlisted(true);
      toast.success(`${candidate.full_name} shortlisted successfully!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to shortlist candidate.");
    } finally {
      setIsShortlisting(false);
    }
  };

  return (
    <div className="group bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Card top */}
      <div className="p-5 flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 border border-indigo-200 text-indigo-700 flex items-center justify-center font-black text-lg shadow-sm">
            {initials}
          </div>
          <span className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-slate-800 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow">
            #{rank}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">{candidate.full_name}</p>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
            <span className="truncate">{candidate.email}</span>
          </p>
          {candidate.phone_number && (
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3 flex-shrink-0" /> {candidate.phone_number}
            </p>
          )}
        </div>

        {score != null && (
          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${scoreColor} flex items-center justify-center shadow`}>
              <span className="text-white font-black text-base">{Math.round(score)}</span>
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Match</span>
          </div>
        )}
      </div>

      {/* Meta tags */}
      <div className="px-5 pb-4 flex flex-wrap gap-2">
        {candidate.city && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[0.68rem] font-bold">
            <MapPin className="w-3 h-3" /> {candidate.city}
          </span>
        )}
        {candidate.qualification && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 text-[0.68rem] font-bold border border-violet-100">
            <GraduationCap className="w-3 h-3" /> {candidate.qualification}
          </span>
        )}
        {candidate.experience_years != null && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-[0.68rem] font-bold border border-amber-100">
            <Briefcase className="w-3 h-3" /> {candidate.experience_years} yr{candidate.experience_years !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Skills */}
      {candidate.skills?.length > 0 && (
        <div className="px-5 pb-4 flex flex-wrap gap-1.5">
          {candidate.skills.slice(0, 6).map((s) => (
            <SkillTag key={s} skill={s} />
          ))}
          {candidate.skills.length > 6 && (
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-[0.68rem] font-bold">+{candidate.skills.length - 6} more</span>
          )}
        </div>
      )}

      {candidate.bio && (
        <p className="px-5 pb-4 text-xs text-slate-500 leading-relaxed line-clamp-2">{candidate.bio}</p>
      )}

      {score != null && (
        <div className="px-5 pb-4">
          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${scoreColor} transition-all duration-700`} style={{ width: `${Math.min(score, 100)}%` }} />
          </div>
        </div>
      )}

      {/* Actions footer — no Email, Resume=View, Shortlist=real API */}
      <div className="mt-auto border-t border-slate-100 px-5 py-3.5 flex items-center justify-end gap-2 bg-slate-50/40">
        {candidate.resume_url && (
          <button
            onClick={handleViewResume}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 text-xs font-bold transition-all shadow-sm"
          >
            <Eye className="w-3.5 h-3.5" /> View Resume
          </button>
        )}
        <button
          onClick={handleShortlist}
          disabled={isShortlisting || shortlisted}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow transition-all ${
            shortlisted
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-default"
              : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 disabled:opacity-60"
          }`}
        >
          {isShortlisting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : shortlisted ? <CheckCircle className="w-3.5 h-3.5" /> : null}
          {shortlisted ? "Shortlisted" : isShortlisting ? "Adding..." : "Shortlist"}
        </button>
      </div>
    </div>
  );
}
