"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, Eye, EyeOff, AlertCircle, ArrowRight, Users, Building2, CheckCircle } from "lucide-react";
import { authApi } from "@/lib/api";
import { UserRole } from "@/lib/types";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: "", email: "", company: "", password: "", confirmPassword: ""
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState<UserRole>('candidate');
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);

  const update = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match"); return; }
    if (!acceptTerms) { setError("Please accept the terms and conditions"); return; }
    setIsLoading(true);
    try {
      const response = await authApi.register({
        email: formData.email,
        full_name: formData.fullName,
        password: formData.password,
        role: role.toUpperCase() as any,
      });
      const token = response.access_token.access_token;
      const userRole = response.user.role.toLowerCase();
      localStorage.setItem("access_token", token);
      localStorage.setItem("userRole", userRole);
      localStorage.setItem("userEmail", response.user.email);
      document.cookie = `access_token=${token}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `user_role=${userRole}; path=/; max-age=86400; SameSite=Lax`;
      window.location.href = userRole === "candidate" ? "/portal/status" : "/dashboard";
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 p-12 bg-[#1e1b4b] text-white relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <Link href="/" className="flex items-center gap-2.5 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Evalyn</span>
        </Link>

        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mb-6">
            Join Evalyn
          </span>
          <h1 className="text-4xl font-bold leading-tight mb-4 text-white">
            Start hiring smarter <span className="text-emerald-300">today.</span>
          </h1>
          <p className="text-indigo-200/80 text-base leading-relaxed mb-8">
            Set up your AI hiring workspace in minutes. Automate candidate screening and interview workflows instantly.
          </p>
          <div className="space-y-3">
            {["Free trial, no credit card required", "Full AI screening & Kanban pipeline", "Cancel anytime"].map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-indigo-100">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-indigo-300/50 relative z-10">© 2026 Evalyn AI. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white overflow-y-auto">
        <div className="w-full max-w-md py-6">
          <Link href="/" className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Evalyn</span>
          </Link>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Create your account</h2>
            <p className="text-sm text-gray-500 mt-1">Start hiring with AI — setup takes under a minute</p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { value: "candidate" as UserRole, label: "Job Seeker", icon: Users, desc: "Apply & track status" },
              { value: "admin" as UserRole, label: "Hiring Manager", icon: Building2, desc: "Recruit candidates" },
            ].map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                  role === r.value
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900'
                    : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                }`}
              >
                <r.icon className={`w-4 h-4 mb-1 ${role === r.value ? 'text-indigo-600' : 'text-gray-400'}`} />
                <span className="text-xs font-semibold">{r.label}</span>
                <span className="text-[0.6875rem] text-gray-500 mt-0.5">{r.desc}</span>
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg mb-5 bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="fullName">Full Name</label>
              <input id="fullName" name="fullName" type="text" placeholder="John Doe"
                value={formData.fullName} onChange={update} required disabled={isLoading}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-400" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="email">Work Email</label>
              <input id="email" name="email" type="email" placeholder="you@company.com"
                value={formData.email} onChange={update} required disabled={isLoading}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-400" />
            </div>

            {role === "admin" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="company">Company Name</label>
                <input id="company" name="company" type="text" placeholder="Acme Inc."
                  value={formData.company} onChange={update} disabled={isLoading}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-400" />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="password">Password</label>
              <div className="relative">
                <input id="password" name="password" type={showPw ? "text" : "password"}
                  placeholder="Min. 8 characters" value={formData.password} onChange={update}
                  required disabled={isLoading}
                  className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-400" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1" tabIndex={-1}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="confirmPassword">Confirm Password</label>
              <div className="relative">
                <input id="confirmPassword" name="confirmPassword" type={showCpw ? "text" : "password"}
                  placeholder="••••••••" value={formData.confirmPassword} onChange={update}
                  required disabled={isLoading}
                  className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-400" />
                <button type="button" onClick={() => setShowCpw(!showCpw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1" tabIndex={-1}>
                  {showCpw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2.5 pt-1">
              <input type="checkbox" id="terms" checked={acceptTerms}
                onChange={e => setAcceptTerms(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 rounded cursor-pointer accent-indigo-600 mt-0.5" />
              <label htmlFor="terms" className="text-xs text-slate-600 cursor-pointer">
                I agree to the{" "}
                <Link href="/terms" className="text-indigo-600 hover:underline font-semibold">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-indigo-600 hover:underline font-semibold">Privacy Policy</Link>
              </label>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                : <>Create Account <ArrowRight className="w-4 h-4 ml-1" /></>
              }
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
