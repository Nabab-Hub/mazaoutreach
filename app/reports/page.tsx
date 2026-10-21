'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Sparkles,
  TrendingUp,
  Percent,
  CheckCircle,
  AlertTriangle,
  Mail,
  Users,
  Send,
  Calendar,
  Flame,
  ArrowRight,
  ShieldCheck,
  Award,
  RefreshCw,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { AnalyticsReport } from '@/lib/reports/analytics';

export default function ReportsPage() {
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispatchingDigest, setDispatchingDigest] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
      }
    } catch (e) {
      console.error('Failed to load reports:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDispatchDigest = async () => {
    setDispatchingDigest(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispatch_digest' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Daily 8 PM digest dispatched to Telegram & Email!');
      } else {
        showToast('error', data.error || 'Failed to dispatch digest');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Digest dispatch failed');
    } finally {
      setDispatchingDigest(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-xl flex items-center gap-3 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
              : 'bg-rose-950/90 text-rose-200 border-rose-500/40'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Phase 5 Analytics & Automation</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            Outreach Performance & Intelligence
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time reply rates, niche conversion funnels, account health, and autonomy ladder progression.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleDispatchDigest}
            disabled={dispatchingDigest}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all"
          >
            {dispatchingDigest ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Sending Digest...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send 8 PM Digest Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {loading && !report ? (
        <div className="p-16 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-3" />
          <p className="text-sm">Calculating outreach analytics and learning metrics...</p>
        </div>
      ) : report ? (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
                <span>Reply Rate</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  {report.overview.overallReplyRate}%
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  ({report.overview.repliedLeads} / {report.overview.contactedLeads} leads)
                </span>
              </div>
              <p className="text-[11px] text-emerald-400/90 font-medium">
                Industry cold average: 3% - 8%
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
                <span>Interested (Hot 🔥)</span>
                <Flame className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-400">
                  {report.overview.overallInterestRate}%
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  ({report.overview.interestedLeads} leads)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Leads requesting calls or information
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
                <span>Call Conversion</span>
                <Calendar className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-amber-400">
                  {report.overview.overallCallRate}%
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  ({report.overview.meetingsScheduled} calls)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Discovery calls & won client deals
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
                <span>Deliverability Health</span>
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  {report.overview.bounceRate}%
                </span>
                <span className="text-xs text-slate-500 font-mono">Bounce rate</span>
              </div>
              <p className="text-[11px] text-emerald-400/90 font-medium">
                Safe: Well below 5% safety threshold
              </p>
            </div>
          </div>

          {/* Funnel + Account Health Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Outreach Conversion Funnel */}
            <div className="lg:col-span-7 p-6 rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Outreach Pipeline Funnel
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Stage progression from CSV upload to closed client deals
                  </p>
                </div>
                <Link
                  href="/pipeline"
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  <span>Open Kanban</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3 pt-2">
                {report.funnel.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-300">{item.stage}</span>
                      <span className="text-slate-400 font-mono">
                        <strong className="text-white font-semibold">{item.count}</strong> (
                        {item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800/80">
                      <div
                        className={`${item.color} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(item.percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Account Health & Autonomy Ladder Promotion */}
            <div className="lg:col-span-5 space-y-6">
              {/* Account Capacity Card */}
              <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-400" />
                    Gmail Accounts & Daily Capacity
                  </h2>
                  <Link
                    href="/accounts"
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Manage
                  </Link>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-400">Today's Utilization</span>
                    <span className="text-xs font-mono font-bold text-indigo-300">
                      {report.accountHealth.totalSentToday} / {report.accountHealth.totalDailyCapacity} emails ({report.accountHealth.utilizationRate}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full"
                      style={{ width: `${Math.min(report.accountHealth.utilizationRate, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{report.accountHealth.activeAccounts} active accounts</span>
                    <span>Safe Warm-up Window active</span>
                  </div>
                </div>
              </div>

              {/* Autonomy Ladder Card */}
              <div className="p-6 rounded-2xl border border-purple-500/30 bg-purple-950/20 backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-400" />
                    Autonomy Ladder & Few-Shot Learning
                  </h2>
                  <Link
                    href="/settings"
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    Settings
                  </Link>
                </div>

                <p className="text-xs text-purple-200/80 leading-relaxed">
                  As you approve emails without edits, the agent gains confidence and suggests automatic promotions from L0 to L3 autonomy.
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-purple-800/40">
                    <span className="text-[10px] uppercase font-semibold text-purple-300 block mb-1">
                      Learned Examples
                    </span>
                    <span className="text-xl font-bold text-white">
                      {report.learningSummary.totalExamples}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-purple-800/40">
                    <span className="text-[10px] uppercase font-semibold text-purple-300 block mb-1">
                      Edit Rate
                    </span>
                    <span className="text-xl font-bold text-purple-300">
                      {report.learningSummary.overallEditRate}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Niche Breakdown Matrix */}
          <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Percent className="w-4 h-4 text-indigo-400" />
                  Niche Conversion & Autonomy Status
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Performance metrics and autonomy level by industry sector
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Niche Sector</th>
                    <th className="py-3 px-4">Total Leads</th>
                    <th className="py-3 px-4">Contacted</th>
                    <th className="py-3 px-4">Replies</th>
                    <th className="py-3 px-4">Reply Rate</th>
                    <th className="py-3 px-4">Interested</th>
                    <th className="py-3 px-4">Interest Rate</th>
                    <th className="py-3 px-4">Autonomy Level</th>
                    <th className="py-3 px-4 text-right">Promotion Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {report.nicheBreakdown.map((item) => (
                    <tr key={item.niche} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {item.label}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{item.totalLeads}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{item.contacted}</td>
                      <td className="py-3.5 px-4 font-mono text-cyan-300 font-bold">{item.replies}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white w-10">
                            {item.replyRate}%
                          </span>
                          <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-cyan-500 h-full rounded-full"
                              style={{ width: `${Math.min(item.replyRate * 2.5, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">{item.interested}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-300 w-10">
                            {item.interestRate}%
                          </span>
                          <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${Math.min(item.interestRate * 2.5, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-200 border border-slate-700">
                          {item.currentAutonomyLevel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {item.upgradeSuggested ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/50">
                            <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                            <span>Ready for {item.suggestedLevel}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            {item.approvedWithoutEdit}/20 to {item.suggestedLevel || 'L1'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
