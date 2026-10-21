'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { NicheTemplate, LeadNiche } from '@/lib/types';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<NicheTemplate[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<LeadNiche>('real_estate');
  const [activeTemplate, setActiveTemplate] = useState<NicheTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New item inputs
  const [newService, setNewService] = useState('');
  const [newBannedPhrase, setNewBannedPhrase] = useState('');

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (data.success && data.templates) {
        setTemplates(data.templates);
        const current = data.templates.find((t: NicheTemplate) => t.niche === selectedNiche);
        if (current) {
          setActiveTemplate(JSON.parse(JSON.stringify(current)));
        } else if (data.templates.length > 0) {
          setSelectedNiche(data.templates[0].niche);
          setActiveTemplate(JSON.parse(JSON.stringify(data.templates[0])));
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSelectNiche = (niche: LeadNiche) => {
    setSelectedNiche(niche);
    const found = templates.find((t) => t.niche === niche);
    if (found) {
      setActiveTemplate(JSON.parse(JSON.stringify(found)));
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSave = async () => {
    if (!activeTemplate) return;
    setSaving(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: activeTemplate.niche,
          templateData: activeTemplate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Saved ${activeTemplate.displayName} pitch angle!`);
        // Update local list
        setTemplates((prev) =>
          prev.map((t) => (t.niche === activeTemplate.niche ? activeTemplate : t))
        );
      } else {
        showToast('error', data.error || 'Failed to save template');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Save request failed');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm('Reset all templates to default pitch angles and banned phrases?')) return;
    setResetting(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Reset templates to platform defaults.');
        setTemplates(data.templates);
        const current = data.templates.find((t: NicheTemplate) => t.niche === selectedNiche);
        if (current) setActiveTemplate(JSON.parse(JSON.stringify(current)));
      }
    } catch (err: any) {
      showToast('error', err.message || 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  const addService = () => {
    if (!newService.trim() || !activeTemplate) return;
    setActiveTemplate({
      ...activeTemplate,
      servicesToHighlight: [...activeTemplate.servicesToHighlight, newService.trim()],
    });
    setNewService('');
  };

  const removeService = (index: number) => {
    if (!activeTemplate) return;
    setActiveTemplate({
      ...activeTemplate,
      servicesToHighlight: activeTemplate.servicesToHighlight.filter((_, i) => i !== index),
    });
  };

  const addBannedPhrase = () => {
    if (!newBannedPhrase.trim() || !activeTemplate) return;
    setActiveTemplate({
      ...activeTemplate,
      bannedPhrases: [...activeTemplate.bannedPhrases, newBannedPhrase.trim()],
    });
    setNewBannedPhrase('');
  };

  const removeBannedPhrase = (phrase: string) => {
    if (!activeTemplate) return;
    setActiveTemplate({
      ...activeTemplate,
      bannedPhrases: activeTemplate.bannedPhrases.filter((p) => p !== phrase),
    });
  };

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
            <span>AI Personalization Rules</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-400" />
            Niche Pitch Angles & Templates
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Configure industry-specific pitch angles, services to highlight, tone directives, and banned spam phrases.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDefaults}
            disabled={resetting || saving}
            className="px-3.5 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {resetting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            <span>{resetting ? 'Resetting...' : 'Reset Defaults'}</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving || resetting || !activeTemplate}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{saving ? 'Saving...' : 'Save Pitch Angle'}</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Niche Selector Sidebar + Editor Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Niche Navigation List */}
        <div className="lg:col-span-1 space-y-2">
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 block mb-2">
              Industry Verticals ({templates.length})
            </span>
            <div className="space-y-1">
              {loading ? (
                <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto text-indigo-400" />
                  <span>Loading verticals...</span>
                </div>
              ) : (
                templates.map((tpl) => (
                  <button
                    key={tpl.niche}
                    onClick={() => handleSelectNiche(tpl.niche)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                      selectedNiche === tpl.niche
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="truncate">{tpl.displayName}</span>
                    <span className="text-[10px] opacity-60 font-mono uppercase">{tpl.niche}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Editor Canvas */}
        <div className="lg:col-span-3 space-y-5">
          {activeTemplate ? (
            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 backdrop-blur-xl space-y-5">
              {/* Vertical Title & Display Name */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
                    Niche ID: {activeTemplate.niche}
                  </span>
                  <h2 className="text-lg font-bold text-white mt-1.5">{activeTemplate.displayName}</h2>
                </div>
              </div>

              {/* Pitch Angle */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Core Problem & Pitch Angle:
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Describes the practical operational pain point the software engineer solves for this industry.
                </p>
                <textarea
                  rows={3}
                  value={activeTemplate.pitchAngle}
                  onChange={(e) =>
                    setActiveTemplate({ ...activeTemplate, pitchAngle: e.target.value })
                  }
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                />
              </div>

              {/* Services to Highlight */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Services to Emphasize (Offered Capabilities):
                </label>
                <div className="space-y-2 mb-3">
                  {activeTemplate.servicesToHighlight.map((svc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200"
                    >
                      <span>• {svc}</span>
                      <button
                        onClick={() => removeService(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addService()}
                    placeholder="Add specific feature or service (e.g. Automated WhatsApp appointment reminder bot)..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={addService}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Target Tone */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Target Tone Directives:
                </label>
                <input
                  type="text"
                  value={activeTemplate.tone}
                  onChange={(e) => setActiveTemplate({ ...activeTemplate, tone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Example High-Performing Email */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Few-Shot Reference Cold Email:
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  This exact structure is injected into the AI system prompt to guide style, length, and greeting.
                </p>
                <textarea
                  rows={8}
                  value={activeTemplate.exampleEmail}
                  onChange={(e) =>
                    setActiveTemplate({ ...activeTemplate, exampleEmail: e.target.value })
                  }
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                />
              </div>

              {/* Banned Spam Phrases */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <label className="text-xs font-semibold text-slate-300">
                    Banned Words & Spam Triggers:
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  The AI is forbidden from using any of these buzzwords to protect email deliverability and reputation.
                </p>

                <div className="flex flex-wrap gap-2 mb-3">
                  {activeTemplate.bannedPhrases.map((phrase) => (
                    <span
                      key={phrase}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-rose-950/40 text-rose-300 border border-rose-800/40"
                    >
                      <span>"{phrase}"</span>
                      <button
                        onClick={() => removeBannedPhrase(phrase)}
                        className="hover:text-rose-100 p-0.5"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newBannedPhrase}
                    onChange={(e) => setNewBannedPhrase(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addBannedPhrase()}
                    placeholder="Add banned phrase (e.g. guaranteed 10x ROI)..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={addBannedPhrase}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center text-slate-500 text-xs">
              Select an industry vertical on the left to edit its template.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
