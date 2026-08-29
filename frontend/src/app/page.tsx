"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles, ArrowRight, Brain, Zap, Shield, Users,
  CheckCircle2, ChevronRight, TrendingUp, Clock,
  BarChart3, Layers, Globe, Star, Play, Check, Cpu,
  FileText, Mail, Lock, Award, CheckCircle, ArrowUpRight,
  GripVertical, UserCheck, Send, Layers2, Code, Terminal,
  RefreshCw, CheckSquare, Server, MessageSquare, AlertCircle,
  Settings, Bot, CornerDownRight, Sliders, FileCheck, UploadCloud,
  UserPlus, MailCheck
} from "lucide-react";

// Pipeline 8 Steps metadata
const PIPELINE_STEPS = [
  {
    id: 1,
    number: "01",
    label: "Draft",
    sub: "Job Spec",
    humanGate: null,
    candidate: null,
  },
  {
    id: 2,
    number: "02",
    label: "Review",
    sub: "AI Prompt",
    humanGate: "YOU APPROVE",
    candidate: { name: "M. Haddad", score: 92, avatar: "MH", bg: "from-blue-600 to-blue-800" },
  },
  {
    id: 3,
    number: "03",
    label: "Publish",
    sub: "Multi-Channel",
    humanGate: null,
    candidate: null,
  },
  {
    id: 4,
    number: "04",
    label: "Apply",
    sub: "Inbound CVs",
    humanGate: null,
    candidate: null,
  },
  {
    id: 5,
    number: "05",
    label: "Screen",
    sub: "GPT-4 Score",
    humanGate: null,
    candidate: { name: "A. Khan", score: 94, avatar: "AK", bg: "from-sky-600 to-blue-700" },
  },
  {
    id: 6,
    number: "06",
    label: "Interview",
    sub: "Automated",
    humanGate: null,
    candidate: { name: "M. Abriq", score: 88, avatar: "MA", bg: "from-blue-700 to-slate-900" },
  },
  {
    id: 7,
    number: "07",
    label: "Decide",
    sub: "Final Offer",
    humanGate: "YOU APPROVE",
    candidate: null,
  },
  {
    id: 8,
    number: "08",
    label: "Onboard",
    sub: "IT & Docs",
    humanGate: null,
    candidate: { name: "U. Javed", score: 96, avatar: "UJ", bg: "from-blue-600 to-cyan-600" },
  },
];

// Demo candidates for simulator
const DEMO_CANDIDATES = [
  {
    id: "c1",
    name: "Abdullah Khan",
    role: "Junior GenAI Engineer",
    score: 96,
    skills: ["LangChain", "FastAPI", "Python", "React", "Vector DBs"],
    summary: "Exceptional match for AI engineering role. Demonstrated hands-on experience building autonomous agents and RAG pipelines.",
    breakdown: { tech: 98, domain: 95, experience: 94 }
  },
  {
    id: "c2",
    name: "Muhammad Abriq",
    role: "AI Developer",
    score: 91,
    skills: ["PyTorch", "Transformers", "Next.js", "PostgreSQL", "Docker"],
    summary: "Strong candidate with solid deep learning background and full-stack web application deployment experience.",
    breakdown: { tech: 92, domain: 90, experience: 91 }
  },
  {
    id: "c3",
    name: "Umer Javed",
    role: "AI/ML Developer",
    score: 88,
    skills: ["Scikit-Learn", "FastAPI", "TailwindCSS", "REST APIs"],
    summary: "Good core machine learning fundamentals and clean API design skills. Recommended for technical interview stage.",
    breakdown: { tech: 88, domain: 89, experience: 86 }
  }
];

export default function LandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(2);
  const [selectedDemoCandidate, setSelectedDemoCandidate] = useState(DEMO_CANDIDATES[0]);

  const [activeFeatureIndex, setActiveFeatureIndex] = useState<number>(0);
  const [activeHubTab, setActiveHubTab] = useState<"gmail" | "test" | "onboarding">("gmail");

  // Auto-advance step timeline every 2.5s
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev % 8) + 1);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // Auto-advance capability cards every 3s
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeatureIndex((prev) => (prev + 1) % 6);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll listener for sticky navbar effect
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white relative overflow-x-hidden">

      {/* Soft Blue Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-tr from-blue-200/40 via-sky-100/40 to-transparent blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-[800px] right-0 w-[600px] h-[600px] bg-blue-100/40 blur-[160px] pointer-events-none -z-10" />

      {/* Header Navigation — Scroll-aware floating navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${isScrolled
            ? "py-2 px-4"
            : "py-0 px-0"
          }`}
      >
        <div
          className={`mx-auto transition-all duration-300 ease-in-out ${isScrolled
              ? "max-w-5xl rounded-2xl bg-white/95 backdrop-blur-2xl shadow-xl shadow-slate-900/10 border border-slate-200/80 px-5 h-13"
              : "max-w-7xl bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 h-16"
            } flex items-center justify-between`}
        >
          <a
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-3 group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-slate-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors">Centra<span className="text-blue-600">.ai</span></span>
              <span
                className={`text-[10px] font-bold text-slate-500 tracking-widest uppercase mt-0.5 transition-all duration-300 ${isScrolled ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
                  }`}
              >
                Recruitment OS
              </span>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600 uppercase tracking-wider">
            <a href="#pipeline-demo" className="hover:text-blue-600 transition-colors">The Pipeline</a>
            <a href="#agents-flow" className="hover:text-blue-600 transition-colors">AI Journey</a>
            <a href="#ai-drive-move" className="hover:text-blue-600 transition-colors">AI Next Move</a>
            <a href="#screening-simulator" className="hover:text-blue-600 transition-colors">Candidate Engine</a>
            <a href="#automation-hub" className="hover:text-blue-600 transition-colors">Automation</a>
          </nav>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-transparent transition-all"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push("/signup")}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                >
                  Create Account <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push("/login")}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-transparent transition-all"
                >
                  Sign In
                </button>
                <button
                  onClick={() => router.push("/signup")}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                >
                  Create Account <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION — Writesonic-style, single viewport */}
      <section id="hero" className="relative pt-20 pb-6 px-6 text-center overflow-hidden min-h-screen flex flex-col justify-center">

        {/* Diagonal line pattern background */}
        <div className="absolute inset-0 pointer-events-none -z-10 opacity-25"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 28px,
              rgba(37,99,235,0.07) 28px,
              rgba(37,99,235,0.07) 29px
            )`
          }}
        />

        {/* Announcement bar */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-white border border-blue-200 text-slate-700 shadow-sm">
            <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black tracking-wide">NEW</span>
            <span>AI Recruitment OS — Gmail &amp; LangGraph agents</span>
            <ChevronRight className="w-3 h-3 text-blue-600" />
          </div>
        </div>

        {/* Main heading */}
        <h1 className="text-3xl sm:text-4xl lg:text-[3.5rem] font-bold tracking-tight text-slate-900 leading-[1.15] mb-3 font-[family-name:var(--font-geist-sans)]">
          Hire top talent from{" "}
          <span className="inline-flex items-center gap-2 align-middle mx-1">
            <span className="inline-flex w-9 h-9 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-xl bg-blue-600 items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </span>
          </span>{" "}
          AI recruitment.
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto font-medium leading-relaxed mb-5">
          See where manual hiring slows you down. Fix it with AI screening, smart pipelines, and automated onboarding.
          Prove the lift in <span className="text-slate-800 font-semibold">quality</span>,{" "}
          <span className="text-slate-800 font-semibold">pipeline speed</span>, and{" "}
          <span className="text-slate-800 font-semibold">retention</span>.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <button
            onClick={() => router.push(isLoggedIn ? "/dashboard" : "/signup")}
            className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isLoggedIn ? "Open Dashboard" : "Book a Demo"}
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push("/signup")}
            className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400 font-bold text-sm shadow-sm hover:shadow-md transition-all"
          >
            Create a new account
          </button>
        </div>

        {/* Before / After Comparison Panel — compact */}
        <div className="mx-auto w-full max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {/* BEFORE card */}
            <div className="relative p-5 rounded-2xl bg-white border border-slate-200 shadow-lg text-left overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent pointer-events-none rounded-2xl" />
              <div className="relative space-y-3.5">
                {/* Header */}
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Before</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    −38% fill rate
                  </span>
                </div>
                {/* Rows */}
                <div className="space-y-2">
                  {[
                    { name: "Sana Mirza", role: "Product Manager", status: "Pending Review", days: "9d" },
                    { name: "Bilal Raza", role: "Backend Engineer", status: "Pending Review", days: "14d" },
                    { name: "Hira Noor", role: "UX Designer", status: "On Hold", days: "21d" },
                  ].map((c) => (
                    <div key={c.name} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500 flex-shrink-0">
                          {c.name.split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{c.name}</p>
                          <p className="text-[10px] text-slate-400">{c.role}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">{c.status}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{c.days} idle</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Footer note */}
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  <p className="text-[11px] text-red-700 font-medium">47 CV backlog · avg <span className="font-black">34 day</span> hire time</p>
                </div>
              </div>
            </div>

            {/* AFTER card */}
            <div className="relative p-5 rounded-2xl bg-white border border-blue-200 shadow-lg text-left overflow-hidden ring-2 ring-blue-500/15">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent pointer-events-none rounded-2xl" />
              <div className="relative space-y-3.5">
                {/* Header */}
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-600 uppercase tracking-widest">After</span>
                    <span className="text-[10px] font-black text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md">✦ Centra</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    +71% fill rate
                  </span>
                </div>
                {/* Rows */}
                <div className="space-y-2">
                  {[
                    { name: "Abdullah Khan", role: "Senior GenAI Engineer", score: 96, skills: ["LangChain", "FastAPI"], status: "Auto-Shortlisted", photo: "/candidates/ak.jpg" },
                    { name: "Muhammad Abriq", role: "AI Developer", score: 91, skills: ["PyTorch", "Docker"], status: "Interview Sent", photo: "/candidates/ma.jpg" },
                    { name: "Umer Javed", role: "AI/ML Developer", score: 88, skills: ["FastAPI", "REST APIs"], status: "Screening", photo: "/candidates/uj.jpg" },
                  ].map((c) => (
                    <div key={c.name} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={c.photo}
                          alt={c.name}
                          className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-slate-200 shadow-sm"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-800">{c.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {c.skills.map((s: string) => (
                              <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-bold">{s}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-black text-blue-600">⚡{c.score}%</p>
                        <p className="text-[9px] font-bold text-emerald-600 mt-0.5">{c.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Footer note */}
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-200">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <p className="text-[11px] text-blue-800 font-medium">47 CVs scored in <span className="font-black">4 min</span> · avg <span className="font-black">6 day</span> hire time</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 8-STAGE ANIMATED PIPELINE TRACK SECTION */}
      <section id="pipeline-demo" className="py-20 px-4 sm:px-8 border-y border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center justify-center gap-1.5">
              <Zap className="w-4 h-4 text-blue-600" /> Live Execution Flow
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Eight Stages. Two of them are yours.</h2>
            <p className="text-sm text-slate-600 font-medium">Centra handles candidate scoring and stage transitions automatically, preserving human approval gates.</p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 shadow-xl space-y-12 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 text-xs">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 font-mono text-blue-700 font-bold bg-blue-100 px-3 py-1 rounded-full border border-blue-200">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  Live: 8 Stages
                </span>
                <span className="text-slate-800 font-extrabold bg-slate-200 px-3 py-1 rounded-full border border-slate-300">
                  2 Human Gates
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-slate-600">
                <span className="text-slate-500">Threshold:</span>
                <span className="text-slate-900 font-bold">70% Match</span>
                <span className="text-slate-400">•</span>
                <span className="text-blue-600 font-bold">Auto-Shortlist</span>
              </div>
            </div>

            <div className="relative pt-16 pb-8 px-2 select-none">
              <div className="absolute top-1/2 left-6 right-6 h-1.5 bg-slate-200 -translate-y-1/2 rounded-full" />
              <div
                className="absolute top-1/2 left-6 h-1.5 bg-gradient-to-r from-blue-600 via-sky-500 to-blue-800 -translate-y-1/2 rounded-full transition-all duration-700 shadow-md"
                style={{ width: `calc(${((activeStep - 1) / 7) * 100}% - 1.5rem)` }}
              />

              <div className="relative z-10 grid grid-cols-8 gap-2">
                {PIPELINE_STEPS.map((step) => {
                  const isActive = activeStep === step.id;
                  const isPassed = activeStep > step.id;

                  return (
                    <div
                      key={step.id}
                      onClick={() => setActiveStep(step.id)}
                      className="flex flex-col items-center group cursor-pointer relative"
                    >
                      {step.candidate && (
                        <div className={`absolute -top-16 transition-all duration-500 transform ${isActive ? "scale-105 -translate-y-1" : "scale-90 opacity-70"
                          }`}>
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-lg text-[11px] font-bold text-slate-800 whitespace-nowrap">
                            <div className={`w-4.5 h-4.5 rounded-full bg-gradient-to-tr ${step.candidate.bg} flex items-center justify-center text-[8px] font-black text-white`}>
                              {step.candidate.avatar}
                            </div>
                            <span className="hidden lg:inline">{step.candidate.name}</span>
                            <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-1 py-0.5 rounded">
                              {step.candidate.score}
                            </span>
                          </div>
                        </div>
                      )}

                      <span className={`text-[11px] font-mono font-bold mb-3 transition-colors ${isActive ? "text-blue-600 scale-110" : isPassed ? "text-slate-700" : "text-slate-400"
                        }`}>
                        {step.number}
                      </span>

                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${isActive
                          ? "bg-blue-600 text-white ring-4 ring-blue-500/20 scale-125 shadow-lg shadow-blue-500/30"
                          : isPassed
                            ? "bg-blue-50 text-blue-700 border border-blue-300"
                            : "bg-white border border-slate-300 text-slate-400 group-hover:border-slate-400"
                        }`}>
                        {isPassed ? (
                          <Check className="w-4 h-4 text-blue-600" />
                        ) : (
                          <div className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-white animate-pulse" : "bg-slate-400"}`} />
                        )}
                      </div>

                      <div className="text-center mt-4 space-y-0.5">
                        <p className={`text-xs font-bold transition-colors ${isActive ? "text-slate-900 font-extrabold" : "text-slate-600"
                          }`}>
                          {step.label}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium hidden sm:block">{step.sub}</p>

                        {step.humanGate && (
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider block mt-1 whitespace-nowrap ${isActive
                              ? "bg-blue-100 border border-blue-300 text-blue-800 animate-pulse"
                              : "bg-slate-100 border border-slate-200 text-slate-600"
                            }`}>
                            {step.humanGate}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-STEP REAL HIRING JOURNEY WITH CURVED ARROWS */}
      <section id="agents-flow" className="py-24 px-6 bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto space-y-16">

          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight">
              <span className="relative inline-block px-4 py-1 rounded-2xl bg-blue-100 border border-blue-300 text-blue-800 rotate-[-2deg] mr-2">
                AI Hiring
              </span>
              on autopilot
            </h2>
            <p className="text-base text-slate-600 font-medium">Watch how Centra AI autonomously processes applications from submission to onboarding.</p>
          </div>

          {/* STAGGERED LAYOUT WITH CURVED CONNECTING ARROWS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative items-start pt-6">

            {/* LEFT / MIDDLE COLUMN (Steps 1 & 2) */}
            <div className="lg:col-span-7 space-y-12 relative">

              {/* STEP 1 (Top Left): Candidate Applies */}
              <div className="space-y-4 max-w-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center font-serif text-xl italic font-bold bg-blue-50">
                    1
                  </div>
                  <h3 className="text-xl font-serif italic text-slate-900">Candidate Applies</h3>
                </div>
                <p className="text-xs text-slate-600 font-medium">Applicants submit their profile and upload their resume directly through the job opening link.</p>

                {/* Step 1 Visual Card */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                        AK
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-900 text-sm">Abdullah Khan</p>
                        <p className="text-xs text-slate-500">abdullah@revnix.com</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold">
                      Junior GenAI Eng
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-[11px]">Resume_Abdullah_Khan.pdf</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-[10px] font-bold text-slate-600">PDF • 1.2 MB</span>
                  </div>
                </div>
              </div>

              {/* CURVED CONNECTING ARROW 1 (From Step 1 to Step 2) */}
              <div className="hidden sm:block absolute left-48 top-44 w-32 h-24 pointer-events-none text-blue-500">
                <svg viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <path d="M10 10 Q 70 20, 50 65" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 3" fill="none" strokeLinecap="round" />
                  <path d="M42 58 L 50 65 L 56 56" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* STEP 2 (Bottom Middle): AI Agent Analyzes Resume */}
              <div className="space-y-4 max-w-lg sm:ml-24 pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center font-serif text-xl italic font-bold bg-blue-50">
                    2
                  </div>
                  <h3 className="text-xl font-serif italic text-slate-900">AI Agent Analyzes CV</h3>
                </div>
                <p className="text-xs text-slate-600 font-medium">GPT-4 parses skills, checks job requirements, and calculates an instant match percentage score.</p>

                {/* Step 2 Form Card */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-lg space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-blue-600 animate-pulse" />
                      <span className="font-extrabold text-slate-900 text-xs">Centra AI Evaluator</span>
                    </div>
                    <span className="font-black text-blue-700 text-xs bg-blue-100 border border-blue-300 px-2.5 py-1 rounded-md">
                      ⚡ 96% Match
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 block">Verified Tech Skills</span>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold">✓ LangChain RAG</span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold">✓ FastAPI</span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold">✓ Vector DBs</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 font-medium">
                    "High technical fit. Auto-shortlisted for screening test phase."
                  </div>
                </div>
              </div>

            </div>

            {/* CURVED CONNECTING ARROW 2 (From Step 2 up to Step 3) */}
            <div className="hidden lg:block absolute left-[52%] top-64 w-36 h-36 pointer-events-none text-blue-500 z-20">
              <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M10 90 Q 60 10, 110 30" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 3" fill="none" strokeLinecap="round" />
                <path d="M100 24 L 110 30 L 106 40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* RIGHT COLUMN (Step 3: AI Agent Hires & Onboards) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center font-serif text-xl italic font-bold bg-blue-50">
                  3
                </div>
                <h3 className="text-xl font-serif italic text-slate-900">AI Agent Hires & Onboards</h3>
              </div>
              <p className="text-xs text-slate-600 font-medium">Dispatches technical tests, schedules calls, and triggers CNIC onboarding document collection.</p>

              {/* Step 3 Card */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-5 relative">

                {/* Header Badge */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-bold text-slate-900 text-xs">Hiring & Onboarding Engine</p>
                      <p className="text-[10px] text-slate-500">Automated candidate advancement.</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold border border-blue-300">
                    Stage: Hired
                  </span>
                </div>

                {/* Automated Actions List */}
                <div className="space-y-3 text-xs">

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-blue-700 font-bold text-[11px]">
                      <span className="flex items-center gap-1.5"><Code className="w-3.5 h-3.5 text-blue-600" /> Technical Test Dispatched</span>
                      <span className="text-[9px] text-slate-500">Auto-sent</span>
                    </div>
                    <p className="text-[10px] text-slate-600">Unique link sent to abdullah@revnix.com</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-slate-800 font-bold text-[11px]">
                      <span className="flex items-center gap-1.5"><MailCheck className="w-3.5 h-3.5 text-blue-600" /> Interview Call Scheduled</span>
                      <span className="text-[9px] text-slate-500">Confirmed</span>
                    </div>
                    <p className="text-[10px] text-slate-600">Google Meet invite synced via Gmail API</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 space-y-1">
                    <div className="flex items-center justify-between text-blue-800 font-bold text-[11px]">
                      <span className="flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5 text-blue-600" /> Onboarding Checklist Active</span>
                      <span className="text-[9px] text-blue-700 font-extrabold">Active</span>
                    </div>
                    <p className="text-[10px] text-slate-600">CNIC upload link & IT setup form triggered</p>
                  </div>

                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ODOO-STYLE SECTION: "LET AI DRIVE THE NEXT MOVE" */}
      <section id="ai-drive-move" className="py-24 px-6 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto space-y-16">

          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight">
              Let AI drive the <span className="relative inline-block px-4 py-1 rounded-2xl bg-blue-100 border border-blue-300 text-blue-800 rotate-[-1deg]">
                next move
              </span>
            </h2>
            <p className="text-base text-slate-600 font-medium">
              From evaluating applications to assigning candidates, Centra AI removes manual steps from recruitment processes.
            </p>
          </div>

          {/* ODOO STYLE USE CASE FLOW GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative pt-4">

            {/* LEFT COLUMN: Use Case & Application Input Card */}
            <div className="lg:col-span-5 space-y-6 relative z-10">

              {/* Heading matching Candidate Applies style */}
              <div className="space-y-1">
                <h3 className="text-xl font-serif italic text-slate-900">Use case</h3>
                <p className="text-xs text-slate-600 font-medium">
                  Assign & evaluate the candidate for the right role expert
                </p>
              </div>

              {/* Application Form Card with extra top padding & curved arrow */}
              <div className="relative pt-12">

                {/* Curved Arrow & New Application Badge */}
                <div className="absolute top-0 left-6 flex items-center gap-2 text-xs text-blue-700 font-bold">
                  <span className="px-3 py-1 rounded-full border border-blue-300 bg-blue-50 text-blue-800 shadow-sm font-extrabold">
                    New Application
                  </span>

                  {/* Swirly Curved SVG Arrow pointing to card */}
                  <svg className="w-12 h-10 text-blue-600 -ml-1 -mb-2" viewBox="0 0 60 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 5 10 Q 45 5, 35 40" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 3" fill="none" strokeLinecap="round" />
                    <path d="M 27 30 L 35 40 L 42 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 shadow-xl space-y-4 pt-6">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Candidate Name</label>
                    <div className="p-3 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold text-sm">
                      Abdullah Khan
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Target Position Spec</label>
                    <div className="p-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium">
                      Senior GenAI Engineer (LangChain & FastAPI)
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/20">
                      Screen CV
                    </button>
                    <button className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-600 text-xs font-bold">
                      Auto-Assign
                    </button>
                  </div>
                </div>

              </div>

            </div>

            {/* CENTER: AI Node with Light Blue Soft Circle */}
            <div className="lg:col-span-2 flex flex-col items-center justify-center relative py-8 lg:py-0">

              {/* Soft Light Blue Circle */}
              <div className="w-36 h-36 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shadow-lg shadow-blue-500/10 relative">
                <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/30 group hover:scale-110 transition-transform">
                  <span className="text-2xl font-black text-white tracking-tighter">AI</span>
                </div>
              </div>

              {/* Outgoing Curved Arrows (SVG Paths) visible on desktop */}
              <div className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 w-28 h-40 pointer-events-none text-blue-500">
                <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  {/* Top Arrow to Card 1 */}
                  <path d="M0 60 Q 40 20, 90 20" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 3" fill="none" strokeLinecap="round" />
                  <path d="M82 14 L 90 20 L 84 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Middle Arrow to Card 2 */}
                  <path d="M0 60 L 90 60" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 3" fill="none" strokeLinecap="round" />
                  <path d="M82 54 L 90 60 L 82 66" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Bottom Arrow to Card 3 */}
                  <path d="M0 60 Q 40 100, 90 100" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 3" fill="none" strokeLinecap="round" />
                  <path d="M84 92 L 90 100 L 82 106" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

            </div>

            {/* RIGHT COLUMN: 3 AI Action Result Cards */}
            <div className="lg:col-span-5 space-y-4 relative z-10">

              {/* Result Card 1: Assignee update */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-md space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                      AK
                    </div>
                    <span className="font-bold text-slate-900">Lead Evaluator</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">3:21 PM</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Unassigned</span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-bold text-blue-700">Abdullah Khan (Assigned)</span>
                </div>
              </div>

              {/* Result Card 2: Priority Upgrade */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-md space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                      AI
                    </div>
                    <span className="font-bold text-slate-900">Match Priority Assessment</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">3:21 PM</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Normal Application</span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Urgent (Fast-Track Top 1%)
                  </span>
                </div>
              </div>

              {/* Result Card 3: Auto Extraction Tags */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-md space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Verified Technical Tags</span>
                  <span className="text-[10px] text-blue-600 font-bold">Auto-Extracted</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold flex items-center gap-1">
                    GenAI Engineering <span className="text-[10px] text-slate-400">×</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold flex items-center gap-1">
                    FastAPI Backends <span className="text-[10px] text-slate-400">×</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold flex items-center gap-1">
                    LangChain Agents <span className="text-[10px] text-slate-400">×</span>
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* INTERACTIVE SECTION 1: AI CANDIDATE SCREENING SIMULATOR */}
      <section id="screening-simulator" className="py-24 px-6">
        <div className="max-w-6xl mx-auto space-y-12">

          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center justify-center gap-1.5">
              <Brain className="w-4 h-4 text-blue-600" /> Multi-Modal AI Evaluation Engine
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Interactive Candidate CV Analysis</h2>
            <p className="text-sm text-slate-600 font-medium">Click on any candidate below to see how GPT-4 evaluates CVs, extracts skills, and calculates instant match scores.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Candidate Selector List Left Column */}
            <div className="lg:col-span-5 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider px-1">Select Candidate Profile</h4>
              {DEMO_CANDIDATES.map((cand) => {
                const isSelected = selectedDemoCandidate.id === cand.id;
                return (
                  <div
                    key={cand.id}
                    onClick={() => setSelectedDemoCandidate(cand)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${isSelected
                        ? "bg-white border-blue-600 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20"
                        : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white ${isSelected ? "bg-blue-600 shadow-md shadow-blue-500/20" : "bg-slate-200 text-slate-700"
                          }`}>
                          {cand.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">{cand.name}</p>
                          <p className="text-xs text-slate-500 font-medium">{cand.role}</p>
                        </div>
                      </div>
                      <span className="font-black text-blue-700 text-sm bg-blue-100 border border-blue-300 px-2.5 py-1 rounded-lg">
                        ⚡ {cand.score}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Evaluation Report Inspector Right Column */}
            <div className="lg:col-span-7 p-6 rounded-3xl bg-white border border-slate-200 space-y-6 shadow-xl">

              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-widest">AI Inspection Report</span>
                  <h3 className="text-lg font-black text-slate-900">{selectedDemoCandidate.name}</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-500 block">Match Index</span>
                  <span className="text-2xl font-black text-blue-600">{selectedDemoCandidate.score}% Recommended</span>
                </div>
              </div>

              {/* Match Score Breakdown Progress Bars */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-700">Skill Breakdown Metrics</p>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">Technical Skills Match</span>
                    <span className="text-blue-600">{selectedDemoCandidate.breakdown.tech}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${selectedDemoCandidate.breakdown.tech}%` }} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">Domain & Requirement Relevance</span>
                    <span className="text-blue-600">{selectedDemoCandidate.breakdown.domain}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${selectedDemoCandidate.breakdown.domain}%` }} />
                  </div>
                </div>
              </div>

              {/* Extracted Key Skills Pills */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700">Verified Technical Skills</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDemoCandidate.skills.map((sk) => (
                    <span key={sk} className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold flex items-center gap-1">
                      <Check className="w-3 h-3 text-blue-600" /> {sk}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Written Executive Summary Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-600" /> AI Executive Summary
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  "{selectedDemoCandidate.summary}"
                </p>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* INTERACTIVE SECTION 2: AUTOMATION & INTEGRATIONS HUB */}
      <section id="automation-hub" className="py-24 px-6 bg-slate-100/70 border-y border-slate-200">
        <div className="max-w-6xl mx-auto space-y-12">

          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center justify-center gap-1.5">
              <Layers2 className="w-4 h-4 text-blue-600" /> Real-Time HR Orchestration Hub
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">Gmail Sync, Test Dispatches & Onboarding Hub</h2>
            <p className="text-sm text-slate-600 font-medium">Click on any module below to inspect Centra's automated candidate communication and employee handoff engine in action.</p>
          </div>

          {/* MAIN INTERACTIVE MAC-STYLE COMMAND WINDOW */}
          <div className="p-2 rounded-[32px] bg-white border border-slate-200 shadow-2xl space-y-0 overflow-hidden">

            {/* WINDOW TOP BAR & TABS */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-xs font-bold text-slate-400 ml-2 font-mono">centra_orchestrator.v2</span>
              </div>

              {/* 3 INTERACTIVE TABS */}
              <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-2xl">
                <button
                  onClick={() => setActiveHubTab("gmail")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeHubTab === "gmail"
                      ? "bg-white text-blue-600 shadow-md shadow-blue-500/10"
                      : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  <Mail className="w-3.5 h-3.5" /> Gmail Sync
                </button>

                <button
                  onClick={() => setActiveHubTab("test")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeHubTab === "test"
                      ? "bg-white text-blue-600 shadow-md shadow-blue-500/10"
                      : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  <Code className="w-3.5 h-3.5" /> Test Dispatch
                </button>

                <button
                  onClick={() => setActiveHubTab("onboarding")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeHubTab === "onboarding"
                      ? "bg-white text-blue-600 shadow-md shadow-blue-500/10"
                      : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  <UserCheck className="w-3.5 h-3.5" /> Onboarding Hub
                </button>
              </div>
            </div>

            {/* TAB CONTENT LIVE DEMO DISPLAY */}
            <div className="p-8 bg-white min-h-[340px] flex items-center justify-center">

              {/* TAB 1: GMAIL INBOX LIVE SYNC */}
              {activeHubTab === "gmail" && (
                <div className="w-full max-w-3xl space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900">Gmail OAuth 2.0 Inbox Listener</h4>
                        <p className="text-xs text-slate-500">Auto-tracking candidate replies & calendar invites</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-blue-100 border border-blue-300 text-blue-800 text-xs font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" /> Live Connected
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                          AK
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">Abdullah Khan <span className="text-[10px] text-slate-500 font-normal">&lt;abdullah@revnix.com&gt;</span></p>
                          <p className="text-slate-600 font-medium">"Confirmed! Tuesday 3 PM works perfectly for the technical discussion."</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold text-[10px]">
                        Stage Auto-Updated: Interview
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs">
                          MA
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">Muhammad Abriq <span className="text-[10px] text-slate-500 font-normal">&lt;abriq@centra.ai&gt;</span></p>
                          <p className="text-slate-600 font-medium">"Submitted coding assessment test solutions."</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        Test Received • Score 94%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TECHNICAL TEST DISPATCH */}
              {activeHubTab === "test" && (
                <div className="w-full max-w-3xl space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold">
                        <Code className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900">Automated Screening Challenge Dispatcher</h4>
                        <p className="text-xs text-slate-500">Auto-generates unique test links upon shortlisting</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-blue-100 border border-blue-300 text-blue-800 text-xs font-bold">
                      Instant Dispatch
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">Python Algorithmic & GenAI Screening Challenge</span>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-extrabold text-[10px]">45 Minutes Limit</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200 font-mono text-[11px] text-slate-700 flex items-center justify-between">
                      <span>https://centra.ai/portal/challenge/tk_9402a8_genai</span>
                      <span className="text-blue-600 font-bold">Copy Link</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 text-[11px] pt-1">
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Automated Code Evaluation</span>
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Anti-Plagiarism Check</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SMART ONBOARDING HUB */}
              {activeHubTab === "onboarding" && (
                <div className="w-full max-w-3xl space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900">Hired Candidate Onboarding Pipeline</h4>
                        <p className="text-xs text-slate-500">Document collection, CNIC verification, and IT provisioning</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-blue-100 border border-blue-300 text-blue-800 text-xs font-bold">
                      Hired Stage Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">CNIC & Verification Docs</span>
                        <span className="text-blue-700 font-extrabold bg-blue-100 px-1.5 py-0.5 rounded text-[10px]">100% Verified</span>
                      </div>
                      <p className="text-slate-600 text-[11px]">Computerized National Identity Card and Academic degree uploaded.</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">IT Account Provisioning</span>
                        <span className="text-blue-700 font-extrabold bg-blue-100 px-1.5 py-0.5 rounded text-[10px]">Slack & GitHub Ready</span>
                      </div>
                      <p className="text-slate-600 text-[11px]">Workplace email & Slack channel invitation sent automatically.</p>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* 3 SUMMARY CARDS BELOW MAIN DEMO THAT CONTROL TABS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* CARD 1 */}
            <div
              onClick={() => setActiveHubTab("gmail")}
              className={`p-6 rounded-3xl transition-all cursor-pointer space-y-3 ${activeHubTab === "gmail"
                  ? "bg-white border-2 border-blue-600 shadow-xl ring-2 ring-blue-500/10"
                  : "bg-white border border-slate-200 hover:border-blue-300"
                }`}
            >
              <div className="flex items-center justify-between">
                <Mail className="w-5 h-5 text-blue-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700">OAuth Sync</span>
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">Gmail Inbox Auto-Sync</h3>
              <p className="text-xs text-slate-600 font-medium">Record candidate email replies and track interview acceptances automatically.</p>
            </div>

            {/* CARD 2 */}
            <div
              onClick={() => setActiveHubTab("test")}
              className={`p-6 rounded-3xl transition-all cursor-pointer space-y-3 ${activeHubTab === "test"
                  ? "bg-white border-2 border-blue-600 shadow-xl ring-2 ring-blue-500/10"
                  : "bg-white border border-slate-200 hover:border-blue-300"
                }`}
            >
              <div className="flex items-center justify-between">
                <Code className="w-5 h-5 text-blue-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700">Automated</span>
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">Technical Test Dispatch</h3>
              <p className="text-xs text-slate-600 font-medium">Auto-send custom coding challenges when candidates move to Shortlisted stage.</p>
            </div>

            {/* CARD 3 */}
            <div
              onClick={() => setActiveHubTab("onboarding")}
              className={`p-6 rounded-3xl transition-all cursor-pointer space-y-3 ${activeHubTab === "onboarding"
                  ? "bg-white border-2 border-blue-600 shadow-xl ring-2 ring-blue-500/10"
                  : "bg-white border border-slate-200 hover:border-blue-300"
                }`}
            >
              <div className="flex items-center justify-between">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700">Hired Handoff</span>
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">Smart Onboarding Hub</h3>
              <p className="text-xs text-slate-600 font-medium">Manage CNIC document verification, IT provisioning, and day-1 welcome handoff.</p>
            </div>

          </div>

        </div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" className="py-24 px-6 bg-slate-50/50 border-t border-slate-200">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center justify-center gap-1.5">
              <Zap className="w-4 h-4 text-blue-600" /> Capabilities Engine
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Everything HR Teams Need to Scale</h2>
            <p className="text-sm text-slate-600 font-medium">Purpose-built tools to simplify candidate shortlisting, evaluations, and onboarding.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: "AI Candidate Scoring",
                desc: "Evaluates every CV against job requirements, calculating an instant percentage match score with strengths & key skills summary.",
                badge: "AI Powered",
                preview: "⚡ 96% Match Calculated"
              },
              {
                icon: Layers,
                title: "Job-Based Applications Panel",
                desc: "Applications are grouped directly by job posting. Click on any job card to instantly inspect its applicants.",
                badge: "Workable Style",
                preview: "📁 14 Active Job Pools"
              },
              {
                icon: Mail,
                title: "Gmail Inbox Sync",
                desc: "Integrated Gmail dispatch and sync. Automatically record candidate replies and track interview invitations.",
                badge: "OAuth 2.0",
                preview: "✉️ Auto-Synced 2m ago"
              },
              {
                icon: Cpu,
                title: "Automated Screening Tests",
                desc: "Automatically send technical screening links when candidates are moved to Shortlisted stage.",
                badge: "Automated",
                preview: "🔗 Link Dispatched"
              },
              {
                icon: Shield,
                title: "Super Admin Control",
                desc: "Restricted administrative control panel for system configuration, user team permissions, and database diagnostics.",
                badge: "RBAC Locked",
                preview: "🔒 Super Admin Only"
              },
              {
                icon: CheckCircle,
                title: "HR Onboarding Hub",
                desc: "Smooth handoff from hired status to onboarding. Track required documentation, IT provisioning, and induction checklists.",
                badge: "Full Pipeline",
                preview: "✅ CNIC & IT Handoff"
              },
            ].map((f, idx) => {
              const isActive = activeFeatureIndex === idx;

              return (
                <div
                  key={f.title}
                  onClick={() => setActiveFeatureIndex(idx)}
                  className={`p-7 rounded-3xl transition-all duration-500 cursor-pointer space-y-4 relative overflow-hidden ${isActive
                      ? "bg-white border-2 border-blue-600 shadow-xl shadow-blue-500/10 scale-[1.02] ring-4 ring-blue-500/10"
                      : "bg-white border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:scale-[1.01]"
                    }`}
                >
                  {/* Top Progress Line for Active Card */}
                  {isActive && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 overflow-hidden">
                      <div className="h-full bg-blue-600 animate-[pulse_1.5s_infinite]" />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${isActive ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-110" : "bg-blue-50 border border-blue-200 text-blue-600"
                      }`}>
                      <f.icon className="w-5.5 h-5.5" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                      )}
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${isActive
                          ? "bg-blue-100 border-blue-300 text-blue-800"
                          : "bg-slate-100 border-slate-200 text-slate-600"
                        }`}>
                        {f.badge}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className={`text-base font-extrabold transition-colors mb-2 ${isActive ? "text-blue-600" : "text-slate-900"
                      }`}>
                      {f.title}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">{f.desc}</p>
                  </div>

                  {/* Micro Live Simulation Pill */}
                  <div className={`pt-2 border-t text-[11px] font-bold flex items-center justify-between transition-colors ${isActive ? "border-blue-100 text-blue-700" : "border-slate-100 text-slate-500"
                    }`}>
                    <span>{f.preview}</span>
                    <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isActive ? "translate-x-1 text-blue-600" : "opacity-0"}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-6 shadow-2xl relative overflow-hidden text-white">
          <h2 className="text-3xl sm:text-5xl font-black text-white">Ready to Upgrade Your HR Workflow?</h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto font-medium leading-relaxed">
            Join modern HR teams using Centra AI to screen candidates, automate invitations, and streamline candidate onboarding.
          </p>
          <div className="pt-2">
            <button
              onClick={() => router.push(isLoggedIn ? "/dashboard" : "/signup")}
              className="px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all inline-flex items-center gap-2"
            >
              {isLoggedIn ? "Open Dashboard Now" : "Create Account & Get Started"} <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 bg-white border-t border-slate-200 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-bold text-slate-900">Centra AI Recruitment OS</span>
          </div>
          <p>© 2026 Centra HR Systems. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
