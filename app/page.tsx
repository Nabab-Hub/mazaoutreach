'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  UploadCloud,
  CheckSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Mail,
  Flame,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Lead } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { LeadDrawer } from '@/components/leads/LeadDrawer';

export default function OverviewPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pendingDraftsCount, setPendingDraftsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/leads').then((res) => res.json()),
      fetch('/api/drafts').then((res) => res.json()).catch(() => ({})),
    ])
      .then(([leadsData, draftsData]) => {
        if (leadsData?.success) {
          setLeads(leadsData.leads || []);
        }
        if (draftsData?.success) {
          setPendingDraftsCount(draftsData.pendingCount || 0);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === 'new').length;
  const contactedLeads = leads.filter((l) => l.status === 'contacted').length;
  const interestedLeads = leads.filter((l) => l.status === 'interested' || l.status === 'meeting').length;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-slate-950 p-8 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Autonomous Client Handling Platform</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Turn Raw Leads Into High-Value Freelance Projects
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Phase 1 is live: import CSV contacts with instant deduplication and email verification, manage your leads database, and prepare for AI personalization.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/import"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import Leads (CSV)</span>
            </Link>
            <Link
              href="/leads"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-medium transition-all"
            >
              <Users className="w-4 h-4 text-slate-400" />
              <span>Explore All Leads ({totalLeads})</span>
            </Link>
          </div>
        </div>

        {/* Ambient background blur */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Leads */}
        <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Leads</span>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-3">{totalLeads}</p>
          <p className="text-[11px] text-slate-500 mt-1">Stored securely in Firestore</p>
        </div>

        {/* Metric 2: Pending Approval Queue */}
        <Link
          href="/approvals"
          className="p-5 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 backdrop-blur-xl hover:border-indigo-500/60 transition-all block group"
        >
          <div className="flex items-center justify-between text-indigo-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Approvals</span>
            <div className="p-2 rounded-xl bg-indigo-900/50 border border-indigo-800/60 text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-indigo-200 mt-3">{pendingDraftsCount}</p>
          <p className="text-[11px] text-indigo-400/80 mt-1">Review & 1-click approve</p>
        </Link>

        {/* Metric 3: Contacted */}
        <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Contacted</span>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-purple-400">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-purple-300 mt-3">{contactedLeads}</p>
          <p className="text-[11px] text-slate-500 mt-1">Via rotated Gmail accounts</p>
        </div>

        {/* Metric 4: Hot Leads */}
        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/15 backdrop-blur-xl hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Interested & Calls</span>
            <div className="p-2 rounded-xl bg-emerald-900/50 border border-emerald-800/60 text-emerald-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-300 mt-3">{interestedLeads}</p>
          <p className="text-[11px] text-emerald-500 mt-1">Instant Telegram alerts triggered</p>
        </div>
      </div>

      {/* Safety & Autopilot Status Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Autonomy Ladder Status */}
        <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-950/40 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Autonomy Ladder (Approval-First)
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Level L0
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Nothing is auto-sent until the owner builds trust. All initial emails and drafted replies require manual approval in the dashboard.
          </p>
          <div className="pt-2">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Approval Reliability Score</span>
              <span className="font-semibold text-slate-200">100% human-verified</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full w-full" />
            </div>
          </div>
        </div>

        {/* Card 2: Multi-Account Warmup & Limits */}
        <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-950/40 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-400" />
              Multi-Account Gmail Rotation
            </h3>
            <span className="text-[11px] font-medium text-slate-400">Safe Send Window</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Spreads cold emails across connected Gmail accounts with random delays of 60-180 seconds, strictly between 10:00-17:00.
          </p>
          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Per Account Target:</span>
            <span className="font-semibold text-slate-200">20-30 emails/day</span>
          </div>
        </div>

        {/* Card 3: Next Build Phases */}
        <div className="p-6 rounded-2xl border border-indigo-900/40 bg-indigo-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-indigo-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Build Roadmap
            </h3>
            <span className="text-[11px] text-indigo-300 font-mono">Phase 1 Done</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-emerald-400 flex items-center gap-1.5">✓ Phase 1: Foundation</span>
              <span className="text-[10px] text-emerald-400">Active</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Phase 2: AI Personalization</span>
              <span className="text-[10px] text-slate-500">Next</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Phase 3: Gmail Sender</span>
              <span className="text-[10px] text-slate-500">Upcoming</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Phase 4: Reply Poller & Alerts</span>
              <span className="text-[10px] text-slate-500">Upcoming</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Leads Preview */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 overflow-hidden">
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              Recently Added Leads
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Click any lead to preview details or update status</p>
          </div>
          <Link
            href="/leads"
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            <span>View All Leads</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-800/60">
          {leads.slice(0, 5).map((lead) => (
            <div
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              className="p-4 hover:bg-slate-900/50 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-sm text-white">{lead.businessName}</span>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {lead.niche}
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>{lead.name}</span>
                  <span>•</span>
                  <span className="font-mono text-slate-300">{lead.email}</span>
                  {lead.city && (
                    <>
                      <span>•</span>
                      <span>{lead.city}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs px-2.5 py-1 rounded-lg border bg-slate-800/80 text-slate-300 border-slate-700 capitalize">
                  {lead.status}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drawer */}
      <LeadDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onStatusChange={async (id, status) => {
          setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
        }}
        onDelete={async (id) => {
          setLeads((prev) => prev.filter((l) => l.id !== id));
        }}
      />
    </div>
  );
}
