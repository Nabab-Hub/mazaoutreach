'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Lead,
  LeadStatus,
  LeadNiche,
  ImportBatch,
} from '@/lib/types';
import { formatDate, formatTimeAgo } from '@/lib/utils';
import { LeadDrawer } from '@/components/leads/LeadDrawer';
import {
  Users,
  Search,
  Filter,
  UploadCloud,
  RefreshCw,
  Building,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  Trash2,
  X,
  Check,
} from 'lucide-react';

const statusTabs: { label: string; value: LeadStatus | 'all' }[] = [
  { label: 'All Leads', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Replied', value: 'replied' },
  { label: 'Interested (Hot)', value: 'interested' },
  { label: 'Meetings', value: 'meeting' },
  { label: 'Won', value: 'won' },
  { label: 'Lost', value: 'lost' },
  { label: 'Unsubscribed', value: 'unsubscribed' },
];

const nicheList: { label: string; value: LeadNiche | 'all' }[] = [
  { label: 'All Niches', value: 'all' },
  { label: 'Club / Community', value: 'club' },
  { label: 'Content Creator', value: 'creator' },
  { label: 'Shop / Retail', value: 'shop' },
  { label: 'Clinic / Health', value: 'clinic' },
  { label: 'Other B2B', value: 'other' },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [nicheFilter, setNicheFilter] = useState<LeadNiche | 'all'>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (nicheFilter !== 'all') params.set('niche', nicheFilter);
      if (batchFilter !== 'all') params.set('batchId', batchFilter);
      if (search.trim()) params.set('search', search.trim());
      params.set('withBatches', 'true');

      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads || []);
        if (data.batches) setBatches(data.batches);
      }
    } catch (e) {
      console.error('Error fetching leads:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    setSelectedLeadIds(new Set());
  }, [statusFilter, nicheFilter, batchFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.size === leads.length && leads.length > 0) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(leads.map((l) => l.id)));
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedLeadIds) }),
      });
      const data = await res.json();
      if (data.success) {
        setLeads((prev) => prev.filter((l) => !selectedLeadIds.has(l.id)));
        if (selectedLead && selectedLeadIds.has(selectedLead.id)) {
          setSelectedLead(null);
        }
        setSelectedLeadIds(new Set());
        setShowBulkDeleteModal(false);
      }
    } catch (err) {
      console.error('Error deleting leads in bulk:', err);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: LeadStatus) => {
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
        );
        if (selectedLead?.id === id) {
          setSelectedLead((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      const res = await fetch(`/api/leads?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== id));
        setSelectedLeadIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  };

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'drafted':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'contacted':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'replied':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      case 'interested':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
      case 'meeting':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
      case 'won':
        return 'bg-green-500/25 text-green-300 border-green-500/50 font-bold';
      case 'lost':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'unsubscribed':
        return 'bg-slate-700/40 text-slate-400 border-slate-600/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getNichePill = (niche: LeadNiche) => {
    switch (niche) {
      case 'club':
        return 'bg-violet-950/60 text-violet-300 border-violet-800/40';
      case 'creator':
        return 'bg-pink-950/60 text-pink-300 border-pink-800/40';
      case 'shop':
        return 'bg-amber-950/60 text-amber-300 border-amber-800/40';
      case 'clinic':
        return 'bg-teal-950/60 text-teal-300 border-teal-800/40';
      default:
        return 'bg-slate-800/60 text-slate-300 border-slate-700/40';
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-400" />
            Leads Database
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage validated client leads, monitor outreach status, and view contact history.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLeads()}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
            title="Refresh Leads"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
          <Link
            href="/import"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import CSV</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="space-y-4">
        {/* Status Scrollable Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800/80">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === tab.value
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Secondary Filter Row: Search, Niche, Batch */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, business name, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-colors"
            />
          </form>

          {/* Niche Dropdown */}
          <div className="md:col-span-3">
            <select
              value={nicheFilter}
              onChange={(e) => setNicheFilter(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60"
            >
              {nicheList.map((n) => (
                <option key={n.value} value={n.value} className="bg-slate-900">
                  {n.label}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Filter Dropdown */}
          <div className="md:col-span-3">
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60"
            >
              <option value="all" className="bg-slate-900">
                All Import Batches ({batches.length})
              </option>
              {batches.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900">
                  {b.filename} ({b.imported} leads)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedLeadIds.size > 0 && (
        <div className="sticky top-4 z-30 p-3 rounded-2xl bg-indigo-950/90 border border-indigo-500/40 shadow-2xl backdrop-blur-xl flex items-center justify-between animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-3 pl-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              {selectedLeadIds.size}
            </span>
            <span className="text-xs font-semibold text-indigo-200">
              {selectedLeadIds.size} of {leads.length} lead{selectedLeadIds.size > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedLeadIds(new Set())}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              Clear Selection
            </button>
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await fetch('/api/drafts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'generate', leadIds: Array.from(selectedLeadIds) }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    window.location.href = '/approvals';
                  }
                } catch (e) {
                  console.error(e);
                } finally {
                  setLoading(false);
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-950/50 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Drafts ({selectedLeadIds.size})</span>
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-950/50 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Leads Table Container */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={leads.length > 0 && selectedLeadIds.size === leads.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    title="Select All Leads"
                  />
                </th>
                <th className="py-3.5 px-4">Lead & Business</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Niche</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Follow-ups</th>
                <th className="py-3.5 px-4">Added</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                    <span>Loading leads...</span>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-300">No leads found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {search || statusFilter !== 'all' || nicheFilter !== 'all'
                        ? 'Try clearing your filters or search query.'
                        : 'Import a CSV file to get started.'}
                    </p>
                    <Link
                      href="/import"
                      className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Import CSV Now</span>
                    </Link>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isSelected = selectedLeadIds.has(lead.id);
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={`transition-colors cursor-pointer group ${
                        isSelected ? 'bg-indigo-950/20 hover:bg-indigo-950/30' : 'hover:bg-slate-900/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-4 px-4 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectLead(lead.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Business & Name */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                            {lead.businessName}
                          </span>
                          {lead.aiEnriched && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-950/80 text-purple-300 border border-purple-800/40 font-mono"
                              title={lead.enrichmentSummary || 'Auto-filled & predicted by AI'}
                            >
                              <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                              <span>AI Enriched</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{lead.name}</span>
                          {lead.city && <span>• {lead.city}</span>}
                        </div>
                      </td>

                      {/* Email / Contact */}
                      <td className="py-4 px-4">
                        <div className="font-mono text-slate-300 truncate max-w-[200px]">
                          {lead.email}
                        </div>
                        {lead.website && (
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                            {lead.website.replace(/^https?:\/\//, '')}
                          </div>
                        )}
                      </td>

                      {/* Niche */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-medium border uppercase tracking-wider ${getNichePill(
                            lead.niche
                          )}`}
                        >
                          {lead.niche}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${getStatusBadge(
                            lead.status
                          )}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span className="capitalize">{lead.status}</span>
                        </span>
                      </td>

                      {/* Follow-up Count */}
                      <td className="py-4 px-4 text-slate-400 font-mono">
                        <span>{lead.followUpCount} / 2</span>
                      </td>

                      {/* Added Date */}
                      <td className="py-4 px-4 text-slate-400 whitespace-nowrap">
                        {formatDate(lead.createdAt)}
                      </td>

                      {/* Quick Action Button */}
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLead(lead);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                          title="View Lead Details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Count Info */}
        <div className="py-3 px-6 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing {leads.length} leads
            {selectedLeadIds.size > 0 && ` (${selectedLeadIds.size} selected)`}
          </span>
          <span className="text-[11px] text-slate-500">
            Click checkboxes for bulk deletion, or click any row to view full context.
          </span>
        </div>
      </div>

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Selected Leads?</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to permanently delete{' '}
              <strong className="text-white font-semibold">{selectedLeadIds.size}</strong> selected leads
              from your outreach list.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-950/50 transition-all"
              >
                {bulkDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete ({selectedLeadIds.size})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Detail Drawer */}
      <LeadDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteLead}
      />
    </div>
  );
}
