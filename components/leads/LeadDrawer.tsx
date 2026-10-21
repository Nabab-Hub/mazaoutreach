'use client';

import React, { useState } from 'react';
import { Lead, LeadStatus, LeadNiche } from '@/lib/types';
import { formatDate, formatTimeAgo } from '@/lib/utils';
import {
  X,
  Building,
  Mail,
  MapPin,
  Globe,
  FileText,
  Clock,
  Sparkles,
  Trash2,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';

interface LeadDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onStatusChange: (id: string, status: LeadStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const statusOptions: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New Lead', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { value: 'drafted', label: 'Drafted', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  { value: 'contacted', label: 'Contacted', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { value: 'replied', label: 'Replied', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { value: 'interested', label: 'Interested (Hot)', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { value: 'meeting', label: 'Meeting Scheduled', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { value: 'won', label: 'Deal Won', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  { value: 'lost', label: 'Lost / Closed', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  { value: 'unsubscribed', label: 'Unsubscribed', color: 'bg-slate-700/40 text-slate-400 border-slate-600/40' },
];

export function LeadDrawer({ lead, onClose, onStatusChange, onDelete }: LeadDrawerProps) {
  const [updating, setUpdating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!lead) return null;

  const handleStatusSelect = async (newStatus: LeadStatus) => {
    setUpdating(true);
    await onStatusChange(lead.id, newStatus);
    setUpdating(false);
  };

  const handleDelete = async () => {
    setUpdating(true);
    await onDelete(lead.id);
    setUpdating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col z-10 overflow-y-auto">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-start justify-between bg-slate-950/40">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {lead.niche}
              </span>
              <span className="text-xs text-slate-400">Added {formatDate(lead.createdAt)}</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">{lead.businessName}</h2>
            <p className="text-sm text-slate-300 font-medium">{lead.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Selector */}
        <div className="p-6 border-b border-slate-800/60 bg-slate-950/20">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            Outreach Pipeline Status
          </label>
          <div className="grid grid-cols-2 gap-2">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                disabled={updating}
                onClick={() => handleStatusSelect(opt.value)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border text-left flex items-center justify-between transition-all ${
                  lead.status === opt.value
                    ? `${opt.color} font-bold ring-2 ring-indigo-500/50 shadow-md`
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>{opt.label}</span>
                {lead.status === opt.value && <CheckCircle className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* Lead Details */}
        <div className="p-6 space-y-5 flex-1">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Contact Information
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
                <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-sm text-slate-200 font-mono select-all truncate">
                  {lead.email}
                </span>
              </div>

              {lead.city && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm text-slate-200">{lead.city}</span>
                </div>
              )}

              {lead.website && (
                <a
                  href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-indigo-500/40 group transition-all"
                >
                  <div className="flex items-center gap-3 truncate">
                    <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-sm text-slate-200 truncate">{lead.website}</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
                </a>
              )}
            </div>
          </div>

          {/* Context Notes */}
          {lead.notes && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Niche & Pain Point Notes
              </h3>
              <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                {lead.notes}
              </div>
            </div>
          )}

          {/* Outreach History Tracker */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Outreach History
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                <span className="text-slate-500 block mb-1">Follow-up Count</span>
                <span className="text-base font-bold text-slate-200">{lead.followUpCount} / 2 max</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                <span className="text-slate-500 block mb-1">Last Contacted</span>
                <span className="text-base font-bold text-slate-200">
                  {formatTimeAgo(lead.lastContactedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Bidirectional Email Conversation Thread */}
          <ConversationThreadSection leadId={lead.id} />

          {/* Custom Fields (if any) */}
          {lead.customFields && Object.keys(lead.customFields).length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Imported Custom Columns
              </h3>
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1.5 text-xs">
                {Object.entries(lead.customFields).map(([key, val]) => (
                  <div key={key} className="flex justify-between py-1 border-b border-slate-800/60 last:border-0">
                    <span className="text-slate-400">{key}:</span>
                    <span className="text-slate-200 font-medium">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-6 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
          {confirmDelete ? (
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={handleDelete}
                disabled={updating}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all"
              >
                Yes, Delete Lead
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 py-2 px-3 rounded-lg hover:bg-rose-950/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Lead</span>
              </button>

              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
              >
                Close Drawer
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationThreadSection({ leadId }: { leadId: string }) {
  const [thread, setThread] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`/api/replies?leadId=${leadId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setThread(d.thread || []);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [leadId]);

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
        <span>Email Thread Context</span>
        <span className="text-[10px] text-slate-500 font-mono font-normal">
          {thread.length} messages
        </span>
      </h3>

      {loading ? (
        <div className="p-4 text-center text-xs text-slate-500">Loading thread...</div>
      ) : thread.length === 0 ? (
        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-500">
          No outreach or replies sent yet.
        </div>
      ) : (
        <div className="space-y-3">
          {thread.map((item, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                item.type === 'sent'
                  ? 'bg-slate-950/70 border-slate-800/80 text-slate-300'
                  : 'bg-indigo-950/20 border-indigo-500/30 text-white'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-slate-800/60">
                <span className="font-semibold flex items-center gap-1.5">
                  {item.type === 'sent' ? (
                    <span className="text-purple-400">Sent by You</span>
                  ) : (
                    <span className="text-emerald-400 font-bold">Prospect Reply</span>
                  )}
                </span>
                <span className="text-slate-500 font-mono">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {item.classification && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                    {item.classification.toUpperCase()}
                  </span>
                  {item.needsHuman && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50">
                      FLAGGED: NEEDS HUMAN
                    </span>
                  )}
                </div>
              )}

              <p className="font-semibold text-slate-200">{item.subject}</p>
              <p className="text-slate-300 whitespace-pre-line leading-relaxed text-[11px] font-sans">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
