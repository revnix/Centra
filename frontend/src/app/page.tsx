"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Users,
  Zap,
  Shield,
  CheckCircle2,
  ArrowRight,
  Brain,
  Code,
  MessageSquare,
  TrendingUp,
  Clock,
  Award
} from "lucide-react";

export default function LandingPage() {
  useEffect(() => {
    // Check if user is logged in
    const userRole = localStorage.getItem("userRole");
    if (userRole) {
      // Redirect based on role
      if (userRole === "candidate") {
        window.location.href = "/portal/status";
      } else {
        window.location.href = "/dashboard/jobs";
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Evalyn
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors">Features</a>
            <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 transition-colors">How It Works</a>
            <a href="#pricing" className="text-slate-600 hover:text-slate-900 transition-colors">Pricing</a>
            <Button variant="outline" onClick={() => window.location.href = "/login"}>
              Sign In
            </Button>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              Get Started
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            <Sparkles className="h-3 w-3 mr-1" />
            AI-Powered Hiring
          </Badge>

          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 leading-tight">
            Hire Smarter with
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> AI</span>
          </h1>

          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Streamline your recruitment process with AI-powered interviews, automated assessments,
            and intelligent candidate matching. Hire the best talent 10x faster.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8"
              onClick={() => window.location.href = "/login"}
            >
              Start Hiring for Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Watch Demo
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 pt-8 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Free 14-day trial
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-6 py-20 bg-white/50 backdrop-blur-sm">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Everything you need to hire top talent
          </h2>
          <p className="text-xl text-slate-600">
            Powered by cutting-edge AI technology
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: Brain,
              title: "AI Interviews",
              description: "Automated technical and behavioral interviews powered by advanced AI",
              color: "blue"
            },
            {
              icon: Code,
              title: "Coding Assessments",
              description: "Real-time code evaluation with instant feedback and scoring",
              color: "purple"
            },
            {
              icon: TrendingUp,
              title: "Smart Matching",
              description: "AI-powered candidate ranking based on skills and cultural fit",
              color: "green"
            },
            {
              icon: Clock,
              title: "Save 90% Time",
              description: "Automate screening and focus on the best candidates only",
              color: "amber"
            },
            {
              icon: MessageSquare,
              title: "Real-time Insights",
              description: "Get instant AI analysis and recommendations for every candidate",
              color: "pink"
            },
            {
              icon: Shield,
              title: "Bias-Free Hiring",
              description: "Make objective decisions based on skills and merit",
              color: "slate"
            }
          ].map((feature, i) => (
            <Card key={i} className="border-2 hover:border-blue-200 transition-all hover:shadow-lg">
              <CardContent className="pt-6 space-y-4">
                <div className={`p-3 bg-${feature.color}-100 rounded-lg w-fit`}>
                  <feature.icon className={`h-6 w-6 text-${feature.color}-600`} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            How it works
          </h2>
          <p className="text-xl text-slate-600">
            Get started in minutes, not weeks
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-12">
          {[
            {
              step: "01",
              title: "Create Your Job",
              description: "Describe your ideal candidate and let AI generate the perfect job description and requirements.",
              icon: Sparkles
            },
            {
              step: "02",
              title: "AI Screens Candidates",
              description: "Candidates complete AI interviews and coding challenges. Get instant scores and rankings.",
              icon: Users
            },
            {
              step: "03",
              title: "Review & Hire",
              description: "Review top candidates with AI insights and make data-driven hiring decisions.",
              icon: Award
            }
          ].map((step, i) => (
            <div key={i} className="flex gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                  {step.step}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <step.icon className="h-6 w-6 text-blue-600" />
                  <h3 className="text-2xl font-semibold text-slate-900">{step.title}</h3>
                </div>
                <p className="text-lg text-slate-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <Card className="bg-gradient-to-br from-blue-600 to-purple-600 border-0">
          <CardContent className="py-16 text-center text-white space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold">
              Ready to transform your hiring?
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Join hundreds of companies using AI to hire better, faster, and smarter.
            </p>
            <div className="pt-4">
              <Button
                size="lg"
                className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8"
                onClick={() => window.location.href = "/login"}
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold">Evalyn</span>
              </div>
              <p className="text-sm text-slate-600">
                AI-powered hiring platform that helps you find and hire the best talent.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900">Features</a></li>
                <li><a href="#" className="hover:text-slate-900">Pricing</a></li>
                <li><a href="#" className="hover:text-slate-900">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900">About</a></li>
                <li><a href="#" className="hover:text-slate-900">Blog</a></li>
                <li><a href="#" className="hover:text-slate-900">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900">Privacy</a></li>
                <li><a href="#" className="hover:text-slate-900">Terms</a></li>
                <li><a href="#" className="hover:text-slate-900">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-slate-500">
            © 2026 Evalyn. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
