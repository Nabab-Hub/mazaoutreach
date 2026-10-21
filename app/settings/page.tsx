'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sparkles,
  ShieldCheck,
  Clock,
  Send,
  Bell,
  Calendar,
  Save,
  CheckCircle,
  Sliders,
  Mail,
  Bot,
  Zap,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { AIRouterConfig, AITaskType } from '@/lib/types';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Available provider keys status
  const [providersStatus, setProvidersStatus] = useState<Record<string, boolean>>({
    gemini: false,
    openai: false,
    grok: false,
    mock: true,
  });

  // AI Router Configuration
  const [aiConfig, setAiConfig] = useState<AIRouterConfig>({
    tasks: {
      personalize: { provider: 'gemini', model: 'gemini-1.5-flash' },
      classify: { provider: 'gemini', model: 'gemini-1.5-flash' },
      reply: { provider: 'openai', model: 'gpt-4o-mini' },
      niche_inference: { provider: 'gemini', model: 'gemini-1.5-flash' },
    },
    fallbacks: ['gemini', 'openai', 'grok'],
    temperature: 0.7,
  });

  // General Settings
  const [settings, setSettings] = useState({
    ownerEmail: 'owner@freelancestudio.io',
    telegramChatId: '',
    calendarBookingLink: 'https://cal.com/alexvance/10min',
    autonomyLevel: 0,
    sendWindowStart: '09:00',
    sendWindowEnd: '18:00',
    timezone: 'Asia/Kolkata',
    dailyTotalLimit: 50,
    minDelaySeconds: 45,
    maxDelaySeconds: 180,
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        if (data.settings) setSettings(data.settings);
        if (data.aiConfig) setAiConfig(data.aiConfig);
        if (data.availableProviders) setProvidersStatus(data.availableProviders);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, aiConfig }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Settings & AI model router updated!');
      } else {
        showToast('error', data.error || 'Failed to save settings');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const updateTaskConfig = (task: AITaskType, provider: 'gemini' | 'openai' | 'grok', model: string) => {
    setAiConfig((prev) => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [task]: { provider, model },
      },
    }));
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
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
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Platform Configuration</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-indigo-400" />
            Settings & AI Model Routing
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Configure multi-provider AI model assignments, autonomy thresholds, and sending safeguards.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: AI Provider Health & Status */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-400" />
              AI Provider Connectivity Status
            </h2>
            <span className="text-xs text-slate-500 font-mono">Managed Server-Side (.env)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              {
                id: 'gemini',
                name: 'Google Gemini',
                models: 'gemini-1.5-pro / flash',
                active: providersStatus.gemini,
              },
              {
                id: 'openai',
                name: 'OpenAI',
                models: 'gpt-4o / gpt-4o-mini',
                active: providersStatus.openai,
              },
              {
                id: 'grok',
                name: 'xAI Grok',
                models: 'grok-beta / grok-2',
                active: providersStatus.grok,
              },
              {
                id: 'mock',
                name: 'Local Heuristic Engine',
                models: 'demo-ai-fallback',
                active: true,
              },
            ].map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white">{p.name}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        p.active ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-500'
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">{p.models}</p>
                </div>
                <span
                  className={`mt-2 text-[10px] font-semibold px-2 py-0.5 rounded w-fit ${
                    p.active
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                      : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                  }`}
                >
                  {p.active ? 'Key Detected' : 'Offline / Demo Mode'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: Task-to-Model Routing Matrix */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400" />
              Task-to-Model Routing Matrix
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Assign specialized AI models per task. If the primary provider times out or rate limits, the system automatically cascades through the fallback chain.
            </p>
          </div>

          <div className="space-y-3">
            {/* Task 1: Personalization */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-white block">
                  1. Personalized Cold Email Writing
                </span>
                <span className="text-[11px] text-slate-500">
                  Researches lead, applies niche pitch angle, and crafts 90-150 word pitch.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={aiConfig.tasks.personalize.provider}
                  onChange={(e) =>
                    updateTaskConfig(
                      'personalize',
                      e.target.value as any,
                      e.target.value === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="gemini">Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="grok">Grok (xAI)</option>
                </select>
                <select
                  value={aiConfig.tasks.personalize.model}
                  onChange={(e) =>
                    updateTaskConfig('personalize', aiConfig.tasks.personalize.provider, e.target.value)
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="gemini-3.7-flash">gemini-3.7-flash (Latest Ultra-Fast)</option>
                  <option value="gemini-2.0-flash">gemini-2.0-flash (High Speed)</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash (Standard)</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro (Deep Context)</option>
                  <option value="gpt-4o-mini">gpt-4o-mini (Cost Efficient)</option>
                  <option value="gpt-4o">gpt-4o (High Nuance)</option>
                  <option value="qwen/qwen3.8-27b">qwen/qwen3.8-27b (Qwen via Groq/OpenAI)</option>
                  <option value="grok-beta">grok-beta (Direct Tone)</option>
                </select>
              </div>
            </div>

            {/* Task 2: Reply Classification */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-white block">
                  2. Inbound Reply Classification
                </span>
                <span className="text-[11px] text-slate-500">
                  Categorizes prospect replies into interested, question, objection, or out of office.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={aiConfig.tasks.classify.provider}
                  onChange={(e) =>
                    updateTaskConfig(
                      'classify',
                      e.target.value as any,
                      e.target.value === 'gemini' ? 'gemini-3.7-flash' : 'gpt-4o-mini'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="gemini">Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="grok">Grok (xAI / Groq)</option>
                </select>
                <select
                  value={aiConfig.tasks.classify.model}
                  onChange={(e) =>
                    updateTaskConfig('classify', aiConfig.tasks.classify.provider, e.target.value)
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="gemini-3.7-flash">gemini-3.7-flash</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                  <option value="qwen/qwen3.8-27b">qwen/qwen3.8-27b</option>
                </select>
              </div>
            </div>

            {/* Task 3: Reply Drafting */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-white block">
                  3. Autonomous Reply Drafting
                </span>
                <span className="text-[11px] text-slate-500">
                  Answers prospect inquiries and provides scheduling link.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={aiConfig.tasks.reply.provider}
                  onChange={(e) =>
                    updateTaskConfig(
                      'reply',
                      e.target.value as any,
                      e.target.value === 'openai' ? 'gpt-4o-mini' : 'gemini-3.7-flash'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Gemini</option>
                  <option value="grok">Grok (xAI / Groq)</option>
                </select>
                <select
                  value={aiConfig.tasks.reply.model}
                  onChange={(e) =>
                    updateTaskConfig('reply', aiConfig.tasks.reply.provider, e.target.value)
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gemini-3.7-flash">gemini-3.7-flash</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                  <option value="qwen/qwen3.8-27b">qwen/qwen3.8-27b</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Autonomy Safety Ladder */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              Autonomy Ladder & Safety Controls
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Control the level of autonomy granted to the agentic workflow. Anything with pricing or contracts always requires human signoff.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              {
                lvl: 0,
                code: 'L0',
                title: 'Human Approval First',
                desc: 'Every single email and reply must be reviewed in the Approval Queue.',
                badge: 'Recommended',
              },
              {
                lvl: 1,
                code: 'L1',
                title: 'Auto Acknowledgements',
                desc: 'Auto-process unsubscribes, out-of-office, and not-interested.',
              },
              {
                lvl: 2,
                code: 'L2',
                title: 'Auto Initial Outbound',
                desc: 'Auto-send initial pitches for niches with 20+ flawless approvals.',
              },
              {
                lvl: 3,
                code: 'L3',
                title: 'Autonomous Replies',
                desc: 'Auto-reply to simple schedule requests when confidence exceeds 95%.',
              },
            ].map((item) => (
              <div
                key={item.lvl}
                onClick={() => setSettings({ ...settings, autonomyLevel: item.lvl })}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  settings.autonomyLevel === item.lvl
                    ? 'border-indigo-500 bg-indigo-950/20 shadow-md shadow-indigo-500/10'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white font-mono">{item.code}</span>
                  {item.badge && (
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-semibold text-white">{item.title}</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: Owner Contact & Booking URL */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Owner Contact & Booking Links
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Owner Alert Email:
              </label>
              <input
                type="email"
                value={settings.ownerEmail}
                onChange={(e) => setSettings({ ...settings, ownerEmail: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Calendar Booking URL:
              </label>
              <input
                type="url"
                value={settings.calendarBookingLink}
                onChange={(e) => setSettings({ ...settings, calendarBookingLink: e.target.value })}
                placeholder="https://cal.com/your-name/10min"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
