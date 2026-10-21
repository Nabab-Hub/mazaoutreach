'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  Sparkles,
  Send,
  Edit3,
  RotateCcw,
  XCircle,
  Building,
  Mail,
  MapPin,
  Globe,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  ChevronDown,
  Layers,
  ArrowRight,
  Bot,
  Zap,
} from 'lucide-react';
import { Draft, LeadNiche } from '@/lib/types';

export default function ApprovalsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [nicheFilter, setNicheFilter] = useState<string>('all');
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);

  // Editing state
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');

  // Action loading states
  const [actionDraftId, setActionDraftId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [batchMode, setBatchMode] = useState<'new' | 'all' | null>(null);

  // Regenerate modal state
  const [regeneratingDraftId, setRegeneratingDraftId] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');
  const [isSubmittingRegen, setIsSubmittingRegen] = useState(false);

  // Status message
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (nicheFilter !== 'all') params.set('niche', nicheFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/drafts?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setDrafts(data.drafts || []);
      }
    } catch (err: any) {
      console.error('Failed to load drafts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [statusFilter, nicheFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDrafts();
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Generate drafts for new leads
  const handleBatchGenerate = async (forceAll: boolean = false) => {
    setGenerating(true);
    setBatchMode(forceAll ? 'all' : 'new');
    try {
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', forceAll }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.generated > 0) {
          showToast('success', `Generated ${data.generated} personalized drafts successfully!`);
        } else {
          showToast('success', data.message || 'All current leads already have drafts.');
        }
        fetchDrafts();
      } else {
        showToast('error', data.error || 'Failed to generate drafts');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Generation request failed');
    } finally {
      setGenerating(false);
      setBatchMode(null);
    }
  };

  // Approve a single draft
  const handleApprove = async (draftId: string, subject?: string, body?: string) => {
    setActionDraftId(draftId);
    setActionType('approve');
    try {
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          draftId,
          editedSubject: subject,
          editedBody: body,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Draft approved & queued for sending!');
        setEditingDraftId(null);
        fetchDrafts();
      } else {
        showToast('error', data.error || 'Approval failed');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Approval failed');
    } finally {
      setActionDraftId(null);
      setActionType(null);
    }
  };

  // Reject a single draft
  const handleReject = async (draftId: string) => {
    setActionDraftId(draftId);
    setActionType('reject');
    try {
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', draftId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Draft rejected.');
        fetchDrafts();
      } else {
        showToast('error', data.error || 'Rejection failed');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Rejection failed');
    } finally {
      setActionDraftId(null);
      setActionType(null);
    }
  };

  // Submit regeneration
  const handleSubmitRegen = async () => {
    if (!regeneratingDraftId) return;
    setIsSubmittingRegen(true);
    try {
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate',
          draftId: regeneratingDraftId,
          instruction,
        }),
      });
      const data = await res.json();
      if (data.success && data.draft) {
        showToast('success', 'Draft regenerated with your instructions!');
        setRegeneratingDraftId(null);
        setInstruction('');
        setDrafts((prev) => prev.map((d) => (d.id === data.draft.id ? data.draft : d)));
        await fetchDrafts();
      } else {
        showToast('error', data.error || 'Regeneration failed');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Regeneration request failed');
    } finally {
      setIsSubmittingRegen(false);
    }
  };

  // Bulk approve
  const handleBulkApprove = async () => {
    if (selectedDraftIds.length === 0) return;
    setIsBulkApproving(true);
    try {
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_approve',
          draftIds: selectedDraftIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Approved ${data.approvedCount} drafts!`);
        setSelectedDraftIds([]);
        fetchDrafts();
      } else {
        showToast('error', data.error || 'Bulk approval failed');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Bulk approval request failed');
    } finally {
      setIsBulkApproving(false);
    }
  };

  const toggleSelectAll = () => {
    const pendingIds = drafts.filter((d) => d.status === 'pending').map((d) => d.id);
    if (selectedDraftIds.length === pendingIds.length) {
      setSelectedDraftIds([]);
    } else {
      setSelectedDraftIds(pendingIds);
    }
  };

  const toggleSelectDraft = (id: string) => {
    setSelectedDraftIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const startEditing = (draft: Draft) => {
    setEditingDraftId(draft.id);
    setEditSubject(draft.editedSubject || draft.subject);
    setEditBody(draft.editedBody || draft.body);
  };

  const pendingCount = drafts.filter((d) => d.status === 'pending').length;

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
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
            <span>Human-In-The-Loop Safety Ladder (L0)</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-indigo-400" />
            Drafts Approval Queue
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Review, edit, regenerate, or approve AI-crafted emails before they enter the Gmail sending queue.
          </p>
        </div>

        {/* Quick Batch Generate Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleBatchGenerate(false)}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-xs shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
            title="Generate AI drafts for newly added leads"
          >
            {generating && batchMode === 'new' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
            <span>{generating && batchMode === 'new' ? 'Drafting Leads...' : 'Generate Drafts for New Leads'}</span>
          </button>

          <button
            onClick={() => handleBatchGenerate(true)}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all disabled:opacity-50"
            title="Generate fresh personalized drafts for all leads in the database"
          >
            {generating && batchMode === 'all' && (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            )}
            <span>{generating && batchMode === 'all' ? 'Drafting All Leads...' : 'Draft for All Leads'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all flex items-center gap-1.5 ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{st} {st === 'pending' && pendingCount > 0 && `(${pendingCount})`}</span>
              {statusFilter === st && loading && (
                <RefreshCw className="w-3 h-3 animate-spin text-white" />
              )}
            </button>
          ))}
        </div>

        {/* Search & Niche Filter */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company, name, or subject..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </form>

          <select
            value={nicheFilter}
            onChange={(e) => setNicheFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Niches</option>
            <option value="club">Fitness & Clubs</option>
            <option value="clinic">Healthcare & Clinics</option>
            <option value="saas">SaaS & Tech</option>
            <option value="shop">E-commerce</option>
            <option value="real_estate">Real Estate</option>
            <option value="creator">Creators</option>
            <option value="agency">Agencies</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Bulk Action Button */}
        {selectedDraftIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{selectedDraftIds.length} selected</span>
            <button
              onClick={handleBulkApprove}
              disabled={isBulkApproving}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              {isBulkApproving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{isBulkApproving ? 'Approving Selected...' : 'Bulk Approve Selected'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Select All Bar (when in pending tab) */}
      {statusFilter === 'pending' && drafts.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={
                selectedDraftIds.length > 0 &&
                selectedDraftIds.length === drafts.filter((d) => d.status === 'pending').length
              }
              onChange={toggleSelectAll}
              className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <span>Select all pending drafts ({pendingCount})</span>
          </label>
          <span className="text-slate-500">Every decision trains your local few-shot model</span>
        </div>
      )}

      {/* Drafts List */}
      {loading ? (
        <div className="p-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Loading outreach drafts...</p>
        </div>
      ) : drafts.length === 0 ? (
        <div className="p-16 text-center space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/40">
          <Bot className="w-12 h-12 text-slate-600 mx-auto" />
          <div>
            <h3 className="text-base font-semibold text-white">No drafts found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              There are no drafts matching your current filter. Click "Generate Drafts for New Leads" to create personalized emails.
            </p>
          </div>
          <button
            onClick={() => handleBatchGenerate(false)}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Now</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => {
            const isEditing = editingDraftId === draft.id;
            const isSelected = selectedDraftIds.includes(draft.id);

            return (
              <div
                key={draft.id}
                className={`p-6 rounded-2xl border transition-all duration-200 backdrop-blur-xl ${
                  isSelected
                    ? 'border-indigo-500/60 bg-slate-950/80 shadow-lg shadow-indigo-500/10'
                    : 'border-slate-800/80 bg-slate-950/50 hover:border-slate-700'
                }`}
              >
                {/* Card Header: Lead info & metadata */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800/80">
                  <div className="flex items-start gap-3">
                    {draft.status === 'pending' && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectDraft(draft.id)}
                        className="mt-1 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
                          {draft.lead?.niche || 'B2B'} Pitch
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-300">
                          {draft.type}
                        </span>
                        {draft.status === 'approved' && (
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded">
                            Approved
                          </span>
                        )}
                        {draft.status === 'rejected' && (
                          <span className="text-[10px] font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/50 px-2 py-0.5 rounded">
                            Rejected
                          </span>
                        )}
                      </div>

                      <h2 className="text-base font-bold text-white mt-2 flex items-center gap-2">
                        {draft.lead?.businessName || 'Target Business'}
                        <span className="text-xs font-normal text-slate-400">
                          ({draft.lead?.name || 'Contact'})
                        </span>
                      </h2>

                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap font-mono">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          {draft.lead?.email}
                        </span>
                        {draft.lead?.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            {draft.lead.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Confidence and Provider badge */}
                  <div className="text-left sm:text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
                      <Zap className="w-3 h-3" />
                      {Math.round((draft.confidence || 0.95) * 100)}% Confidence
                    </span>
                    <p className="text-[11px] text-slate-400 font-mono mt-1">
                      {draft.aiProvider.toUpperCase()} • {draft.model}
                    </p>
                    {draft.wordCount && (
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {draft.wordCount} words (Target: 90-150)
                      </p>
                    )}
                  </div>
                </div>

                {/* Draft Content Area */}
                <div className="mt-4 space-y-3">
                  {isEditing ? (
                    /* Inline Editing Mode */
                    <div className="space-y-3 p-4 rounded-xl bg-slate-900/80 border border-indigo-500/40">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Subject Line:
                        </label>
                        <input
                          type="text"
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-semibold text-slate-300">
                            Email Body:
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {editBody.split(/\s+/).filter(Boolean).length} words
                          </span>
                        </div>
                        <textarea
                          rows={8}
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => setEditingDraftId(null)}
                          disabled={actionDraftId === draft.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleApprove(draft.id, editSubject, editBody)}
                          disabled={actionDraftId === draft.id}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                        >
                          {actionDraftId === draft.id && actionType === 'approve' ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {actionDraftId === draft.id && actionType === 'approve'
                              ? 'Saving & Approving...'
                              : 'Save & Approve'}
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Read-Only Preview Mode */
                    <div className="space-y-2 p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs">
                      <div className="pb-2 border-b border-slate-800/60">
                        <span className="text-slate-400 font-semibold mr-2">Subject:</span>
                        <span className="text-white font-medium">
                          {draft.editedSubject || draft.subject}
                        </span>
                      </div>
                      <div className="pt-1 text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                        {draft.editedBody || draft.body}
                      </div>

                      {draft.reasoning && (
                        <div className="pt-2 text-[11px] text-slate-500 italic border-t border-slate-800/40">
                          💡 AI Angle: {draft.reasoning}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                {!isEditing && draft.status === 'pending' && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditing(draft)}
                        disabled={actionDraftId === draft.id}
                        className="px-3 py-1.5 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => {
                          setRegeneratingDraftId(draft.id);
                          setInstruction('');
                        }}
                        disabled={actionDraftId === draft.id}
                        className="px-3 py-1.5 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Regenerate</span>
                      </button>

                      <button
                        onClick={() => handleReject(draft.id)}
                        disabled={actionDraftId === draft.id}
                        className="px-3 py-1.5 rounded-lg border border-rose-900/40 hover:bg-rose-950/40 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        {actionDraftId === draft.id && actionType === 'reject' ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        <span>
                          {actionDraftId === draft.id && actionType === 'reject'
                            ? 'Rejecting...'
                            : 'Reject'}
                        </span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleApprove(draft.id)}
                      disabled={actionDraftId === draft.id}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                    >
                      {actionDraftId === draft.id && actionType === 'approve' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {actionDraftId === draft.id && actionType === 'approve'
                          ? 'Approving...'
                          : 'Approve & Send'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Regenerate Instruction Modal */}
      {regeneratingDraftId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-indigo-400" />
                Regenerate AI Draft
              </h3>
              <button
                onClick={() => setRegeneratingDraftId(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Provide feedback or specific instructions to re-angle this draft. The AI model will preserve recipient data while rewriting the pitch.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Custom Instruction / Angle Feedback:
              </label>
              <textarea
                rows={4}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g. Make it more casual and mention our experience building mobile reservation apps in Mumbai..."
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Quick suggested chips */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Quick Prompts:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Make it more casual and friendly',
                  'Focus specifically on WhatsApp automations',
                  'Keep it ultra concise (under 80 words)',
                  'Highlight fast delivery within 2 weeks',
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setInstruction(chip)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setRegeneratingDraftId(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRegen}
                disabled={isSubmittingRegen}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {isSubmittingRegen ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{isSubmittingRegen ? 'Rewriting...' : 'Regenerate Draft'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
