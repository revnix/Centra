"use client";

import { useState } from "react";
import { Bot, Mic, Video, Settings2, Sparkles, PhoneCall, MessageSquare, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AgentPage() {
  const [chatMessage, setChatMessage] = useState("");

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
          <Bot className="h-8 w-8 text-indigo-600" />
          AI HR Agent
        </h1>
        <p className="text-slate-500 max-w-2xl text-lg">
          Interact with the live AI assistant via Voice or Text Chat. This module will soon be integrated with LiveKit for real-time interactions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice & Video Agent Area */}
        <div className="flex flex-col gap-6">
          <div className="flex-1 bg-slate-900 rounded-3xl overflow-hidden relative shadow-2xl min-h-[550px] flex flex-col items-center justify-center border border-slate-800">
            {/* Ambient Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />
            
            <div className="absolute top-4 left-4 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700 flex items-center gap-2">
              <Mic className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-300">Voice Mode</span>
            </div>

            {/* Agent Avatar */}
            <div className="relative z-10 w-48 h-48 bg-slate-800/80 backdrop-blur-md rounded-full border-4 border-indigo-500/50 flex items-center justify-center shadow-[0_0_60px_rgba(99,102,241,0.4)] mb-8">
              <Bot className="w-24 h-24 text-indigo-400" />
              <div className="absolute inset-0 rounded-full border-4 border-indigo-400/30 animate-ping" style={{ animationDuration: '3s' }} />
            </div>

            <h2 className="z-10 text-2xl font-bold text-white mb-2">Evalyn AI is ready</h2>
            <p className="z-10 text-slate-400 mb-8 max-w-sm text-center px-4">
              Click connect to start a live audio/video session with your HR assistant.
            </p>

            <div className="z-10 flex items-center gap-4">
              <Button size="lg" className="rounded-full px-8 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 gap-2 h-14 text-lg">
                <PhoneCall className="w-5 h-5" />
                Connect Voice
              </Button>
            </div>
            
            {/* Settings mini bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-800/80 backdrop-blur-md px-6 py-3 rounded-full border border-slate-700">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-slate-300">Mic Ready</span>
                </div>
                <div className="w-1 h-1 bg-slate-600 rounded-full" />
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-slate-500" />
                  <span className="text-xs text-slate-500">Cam Off</span>
                </div>
            </div>
          </div>
        </div>

        {/* Text Chat Area */}
        <div className="flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden min-h-[550px]">
          {/* Chat Header */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 leading-tight">Text Chat</h2>
                <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online
                </p>
              </div>
            </div>
            <div className="bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> LiveKit Chat
              </span>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm border border-indigo-700">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-5 py-3 shadow-sm max-w-[85%]">
                <p className="text-sm text-slate-700 leading-relaxed">
                  Hello! I'm Evalyn, your AI HR Assistant. I can help you with onboarding, checking application statuses, reviewing company policies, or setting up interview schedules.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 flex-row-reverse">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-300">
                <User className="w-4 h-4 text-slate-500" />
              </div>
              <div className="bg-indigo-600 border border-indigo-700 rounded-2xl rounded-tr-none px-5 py-3 shadow-sm max-w-[85%]">
                <p className="text-sm text-white leading-relaxed">
                  Can you tell me about the leave policy?
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm border border-indigo-700">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-5 py-3 shadow-sm max-w-[85%]">
                <p className="text-sm text-slate-700 leading-relaxed">
                  Certainly! Full-time employees receive 20 days of paid time off per year, plus 10 public holidays. You can request leave through the Attendance dashboard. Would you like me to guide you there?
                </p>
              </div>
            </div>
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-white border-t border-slate-200">
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-full px-2 py-2 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-300 transition-all shadow-inner">
              <input 
                type="text" 
                placeholder="Type your message..." 
                className="flex-1 bg-transparent border-none focus:outline-none px-4 text-sm text-slate-700 placeholder:text-slate-400"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
              />
              <Button size="icon" className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex-shrink-0 w-10 h-10">
                <Send className="w-4 h-4 ml-0.5" />
              </Button>
            </div>
            <p className="text-[10px] text-center text-slate-400 mt-3 font-medium">
              AI-generated responses. This is a dummy interface for the upcoming LiveKit text integration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
