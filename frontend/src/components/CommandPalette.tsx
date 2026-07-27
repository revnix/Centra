"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Briefcase, Users, Plus, ArrowRight, Layers, FileText, Settings, X, Sparkles } from "lucide-react";
import { useApplications } from "@/lib/hooks/useApplications";
import { useJobs } from "@/lib/hooks/useJobs";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: applications = [] } = useApplications();
  const { data: jobs = [] } = useJobs();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Trigger open via custom event or prop
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredCandidates = applications.filter((app: any) =>
    (app.candidate?.full_name || "").toLowerCase().includes(query.toLowerCase()) ||
    (app.job?.title || "").toLowerCase().includes(query.toLowerCase())
  ).slice(0, 4);

  const filteredJobs = jobs.filter((j: any) =>
    (j.title || "").toLowerCase().includes(query.toLowerCase()) ||
    (j.department || "").toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  const actions = [
    { label: "Create New Job", icon: Plus, action: () => router.push("/dashboard/jobs/new") },
    { label: "View Candidate Pipeline", icon: Layers, action: () => router.push("/dashboard/pipeline") },
    { label: "AI Job Generator", icon: Sparkles, action: () => router.push("/dashboard/generated-jobs") },
    { label: "View All Applications", icon: Users, action: () => router.push("/dashboard/applications") },
  ].filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center px-3.5 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <Search className="w-4 h-4 text-zinc-400 mr-2.5 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search candidates, jobs…"
            className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md"
          >
            <span className="kbd-pill">ESC</span>
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-3">
          {/* Quick Actions */}
          {actions.length > 0 && (
            <div>
              <p className="text-[0.6875rem] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1">
                Quick Actions
              </p>
              {actions.map((act) => (
                <button
                  key={act.label}
                  onClick={() => handleSelect(act.action)}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <act.icon className="w-4 h-4 text-indigo-500" />
                    <span>{act.label}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              ))}
            </div>
          )}

          {/* Candidates */}
          {filteredCandidates.length > 0 && (
            <div>
              <p className="text-[0.6875rem] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1">
                Candidates
              </p>
              {filteredCandidates.map((app: any) => (
                <button
                  key={app.id}
                  onClick={() => handleSelect(() => router.push(`/dashboard/applications/${app.id}`))}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-zinc-400" />
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {app.candidate?.full_name || "Unknown"}
                    </span>
                    <span className="text-zinc-400 text-[0.75rem]">• {app.job?.title || "—"}</span>
                  </div>
                  <span className="text-[0.6875rem] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                    {app.match_score ?? app.ai_score ?? 0}%
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Jobs */}
          {filteredJobs.length > 0 && (
            <div>
              <p className="text-[0.6875rem] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1">
                Jobs
              </p>
              {filteredJobs.map((j: any) => (
                <button
                  key={j.id}
                  onClick={() => handleSelect(() => router.push(`/dashboard/jobs/${j.id}/candidates`))}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="w-4 h-4 text-zinc-400" />
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{j.title}</span>
                  </div>
                  <span className="text-[0.6875rem] text-zinc-400">{j.department || "General"}</span>
                </button>
              ))}
            </div>
          )}

          {actions.length === 0 && filteredCandidates.length === 0 && filteredJobs.length === 0 && (
            <div className="py-8 text-center text-xs text-zinc-400">
              No matching commands or results found.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3.5 py-2 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[0.6875rem] text-zinc-400">
          <span>Navigation: <kbd className="kbd-pill">↑</kbd> <kbd className="kbd-pill">↓</kbd></span>
          <span>Select: <kbd className="kbd-pill">↵</kbd></span>
        </div>
      </div>
    </div>
  );
}
