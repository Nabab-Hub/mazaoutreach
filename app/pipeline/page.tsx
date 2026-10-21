'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GitPullRequest,
  Sparkles,
  Flame,
  Calendar,
  CheckCircle,
  Clock,
  Building,
  Mail,
  ChevronRight,
  RefreshCw,
  Plus,
  Bot,
  AlertCircle,
  CheckCircle2,
  Send,
  MessageSquare,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Lead, LeadStatus } from '@/lib/types';
import { LeadDrawer } from '@/components/leads/LeadDrawer';

const stages: { key: LeadStatus; label: string; color: string; badgeColor: string }[] = [
  { key: 'contacted', label: 'Contacted', color: 'border-purple-500/30 bg-purple-950/15', badgeColor: 'bg-purple-950/60 text-purple-300 border-purple-800/40' },
  { key: 'replied', label: 'Replied', color: 'border-cyan-500/30 bg-cyan-950/15', badgeColor: 'bg-cyan-950/60 text-cyan-300 border-cyan-800/40' },
  { key: 'interested', label: 'Interested (Hot 🔥)', color: 'border-emerald-500/40 bg-emerald-950/20', badgeColor: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40' },
  { key: 'meeting', label: 'Discovery Call', color: 'border-amber-500/40 bg-amber-950/20', badgeColor: 'bg-amber-950/60 text-amber-300 border-amber-800/40' },
  { key: 'won', label: 'Deal Won 🎉', color: 'border-green-500/50 bg-green-950/30', badgeColor: 'bg-green-950/60 text-green-300 border-green-800/50' },
  { key: 'lost', label: 'Lost / Closed', color: 'border-slate-800 bg-slate-950/30', badgeColor: 'bg-slate-900 text-slate-400 border-slate-800' },
];

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [actionLeadId, setActionLeadId] = useState<string | null>(null);

  // Simulate reply modal
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [simLeadId, setSimLeadId] = useState('');
  const [simReplyType, setSimReplyType] = useState<'interested' | 'question' | 'pricing' | 'declined' | 'unsubscribe'>('interested');
  const [simCustomText, setSimCustomText] = useState('');
  const [isSubmittingSim, setIsSubmittingSim] = useState(false);

  // Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    setActionLeadId(leadId);
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Moved lead to ${newStatus.toUpperCase()}`);
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
        );
        if (selectedLead && selectedLead.id === leadId) {
          setSelectedLead({ ...selectedLead, status: newStatus });
        }
      }
    } catch (err: any) {
      showToast('error', err.message || 'Status update failed');
    } finally {
      setActionLeadId(null);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    setActionLeadId(leadId);
    try {
      const res = await fetch(`/api/leads?id=${leadId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Lead deleted.');
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
        setSelectedLead(null);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Delete failed');
    } finally {
      setActionLeadId(null);
    }
  };

  const handlePollInboxes = async () => {
    setPolling(true);
    try {
      const res = await fetch('/api/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'poll' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Polled active inboxes for replies.');
        fetchLeads();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Polling failed');
    } finally {
      setPolling(false);
    }
  };

  const handleSimulateReply = async () => {
    setIsSubmittingSim(true);
    try {
      let replyBody = simCustomText;
      if (!replyBody) {
        if (simReplyType === 'interested') {
          replyBody = `Hi Alex,\n\nThanks for following up! We would definitely be interested in an automated booking flow. Are you open for a quick 10-minute call this Thursday afternoon?`;
        } else if (simReplyType === 'question') {
          replyBody = `Hi Alex,\n\nDoes your WhatsApp reminder setup connect directly with our existing calendar or database?`;
        } else if (simReplyType === 'pricing') {
          replyBody = `Hi Alex,\n\nHow much do you charge for a full build? Please send over your fixed price rate sheet and contract terms.`;
        } else if (simReplyType === 'declined') {
          replyBody = `Hi, thank you for reaching out, but we already have an internal team handling this. We will pass for now.`;
        } else if (simReplyType === 'unsubscribe') {
          replyBody = `STOP. Please remove our email address from your mailing list permanently.`;
        }
      }

      const res = await fetch('/api/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simulate',
          leadId: simLeadId || undefined,
          replyBody,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(
          'success',
          `Simulated reply processed! Category: ${data.reply?.classification.toUpperCase()}`
        );
        setIsSimulateOpen(false);
        setSimCustomText('');
        fetchLeads();
      } else {
        showToast('error', data.error || 'Simulation failed');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Simulation failed');
    } finally {
      setIsSubmittingSim(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
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
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Autonomous Inbound Sales Pipeline</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <GitPullRequest className="w-6 h-6 text-indigo-400" />
            <span>Interested Leads Pipeline</span>
            {loading && <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Track leads across outreach stages: from initial contact to classified replies, booked discovery calls, and closed deals.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSimulateOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-medium transition-all"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            <span>Simulate Lead Reply</span>
          </button>

          <button
            onClick={handlePollInboxes}
            disabled={polling}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${polling ? 'animate-spin' : ''}`} />
            <span>{polling ? 'Checking Inboxes...' : 'Poll Inboxes'}</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stages.map((stage) => {
          const stageLeads = leads.filter((l) => l.status === stage.key);

          return (
            <div
              key={stage.key}
              className={`p-4 rounded-2xl border flex flex-col min-h-[500px] transition-all backdrop-blur-xl ${stage.color}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <span className="text-xs font-bold text-white tracking-wide">
                  {stage.label}
                </span>
                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${stage.badgeColor}`}>
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards in Column */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {loading ? (
                  <div className="h-32 flex flex-col items-center justify-center text-[11px] text-slate-500 text-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Loading...</span>
                  </div>
                ) : stageLeads.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-[11px] text-slate-500 text-center italic">
                    No leads in this stage
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/60 transition-all cursor-pointer shadow-sm hover:shadow-md hover:shadow-indigo-500/10 space-y-2 group"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {lead.niche}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-white leading-tight">
                          {lead.businessName}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{lead.name}</p>
                      </div>

                      <div className="text-[10px] text-slate-500 font-mono truncate">
                        {lead.email}
                      </div>

                      {/* Quick stage mover action */}
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">
                          {lead.city || 'Remote'}
                        </span>

                        {stage.key === 'contacted' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(lead.id, 'replied');
                            }}
                            disabled={actionLeadId === lead.id}
                            className="text-cyan-400 hover:underline font-semibold flex items-center gap-1 disabled:opacity-50"
                          >
                            {actionLeadId === lead.id && (
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            )}
                            <span>{actionLeadId === lead.id ? 'Moving...' : 'Mark Replied →'}</span>
                          </button>
                        )}
                        {stage.key === 'replied' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(lead.id, 'interested');
                            }}
                            disabled={actionLeadId === lead.id}
                            className="text-emerald-400 hover:underline font-semibold flex items-center gap-1 disabled:opacity-50"
                          >
                            {actionLeadId === lead.id && (
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            )}
                            <span>{actionLeadId === lead.id ? 'Moving...' : 'Mark Hot 🔥 →'}</span>
                          </button>
                        )}
                        {stage.key === 'interested' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(lead.id, 'meeting');
                            }}
                            disabled={actionLeadId === lead.id}
                            className="text-amber-400 hover:underline font-semibold flex items-center gap-1 disabled:opacity-50"
                          >
                            {actionLeadId === lead.id && (
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            )}
                            <span>{actionLeadId === lead.id ? 'Moving...' : 'Book Call 📅 →'}</span>
                          </button>
                        )}
                        {stage.key === 'meeting' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(lead.id, 'won');
                            }}
                            disabled={actionLeadId === lead.id}
                            className="text-green-400 hover:underline font-semibold flex items-center gap-1 disabled:opacity-50"
                          >
                            {actionLeadId === lead.id && (
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            )}
                            <span>{actionLeadId === lead.id ? 'Moving...' : 'Mark Won 🎉 →'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-over Lead Detail Drawer */}
      <LeadDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteLead}
      />

      {/* Simulate Inbound Reply Modal */}
      {isSimulateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-400" />
                Simulate Inbound Prospect Reply
              </h3>
              <button onClick={() => setIsSimulateOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Triggers the entire Phase 4 reply automation pipeline: reads inbound message, runs AI classifier, logs reply, drafts a response with your calendar link, and dispatches a Telegram alert.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Select Contacted Lead:
                </label>
                <select
                  value={simLeadId}
                  onChange={(e) => setSimLeadId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select a lead (defaults to first contacted)</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.businessName} ({l.name} - {l.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Scenario Intent:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'interested', label: '🔥 Interested (Wants Call)' },
                    { id: 'question', label: '❓ Technical Question' },
                    { id: 'pricing', label: '💰 Custom Quote / Price' },
                    { id: 'declined', label: '✋ Not Interested' },
                    { id: 'unsubscribe', label: '⛔ Unsubscribe / STOP' },
                  ].map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setSimReplyType(sc.id as any)}
                      className={`p-2 rounded-lg text-left text-xs font-medium border transition-all ${
                        simReplyType === sc.id
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Custom Reply Message (Optional):
                </label>
                <textarea
                  rows={3}
                  value={simCustomText}
                  onChange={(e) => setSimCustomText(e.target.value)}
                  placeholder="Leave empty to use realistic sample response based on scenario..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsSimulateOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSimulateReply}
                disabled={isSubmittingSim}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {isSubmittingSim ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{isSubmittingSim ? 'Classifying & Drafting...' : 'Trigger Inbound Reply'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
