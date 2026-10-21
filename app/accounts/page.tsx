'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Sparkles,
  Plus,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  RotateCw,
  Send,
  Pause,
  Play,
  Trash2,
  Sliders,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Zap,
  Activity,
  Layers,
} from 'lucide-react';
import { EmailAccount, SentEmail, WARMUP_LEVEL_MAP } from '@/lib/types';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCapacity, setTotalCapacity] = useState(0);
  const [sentTodayTotal, setSentTodayTotal] = useState(0);

  // Test email modal state
  const [testModalAccount, setTestModalAccount] = useState<EmailAccount | null>(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Limit edit modal state
  const [editingLimitAccount, setEditingLimitAccount] = useState<EmailAccount | null>(null);
  const [newLimit, setNewLimit] = useState(25);
  const [newWarmup, setNewWarmup] = useState(1);

  // Notification toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [actionAccountId, setActionAccountId] = useState<string | null>(null);
  const [savingLimits, setSavingLimits] = useState(false);

  const fetchAccountsAndSent = async () => {
    setLoading(true);
    try {
      const [accRes, sentRes] = await Promise.all([
        fetch('/api/accounts').then((r) => r.json()),
        fetch('/api/send').then((r) => r.json()).catch(() => ({})),
      ]);

      if (accRes.success) {
        setAccounts(accRes.accounts || []);
        setTotalCapacity(accRes.totalDailyCapacity || 0);
        setSentTodayTotal(accRes.sentTodayTotal || 0);
      }

      if (sentRes.success) {
        setSentEmails(sentRes.sentEmails || []);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsAndSent();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleToggleStatus = async (account: EmailAccount) => {
    setActionAccountId(account.id);
    const nextStatus = account.status === 'active' ? 'paused' : 'active';
    try {
      const res = await fetch('/api/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: account.id,
          updates: { status: nextStatus },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `${account.gmailAddress} is now ${nextStatus}.`);
        fetchAccountsAndSent();
      } else {
        showToast('error', data.error || 'Failed to update status');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Status toggle failed');
    } finally {
      setActionAccountId(null);
    }
  };

  const handleDeleteAccount = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to disconnect ${email}?`)) return;
    setActionAccountId(id);
    try {
      const res = await fetch(`/api/accounts?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Disconnected ${email}`);
        fetchAccountsAndSent();
      } else {
        showToast('error', data.error || 'Failed to disconnect');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Delete failed');
    } finally {
      setActionAccountId(null);
    }
  };

  const handleSaveLimits = async () => {
    if (!editingLimitAccount) return;
    setSavingLimits(true);
    try {
      const res = await fetch('/api/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingLimitAccount.id,
          updates: {
            dailyLimit: Number(newLimit),
            warmupLevel: Number(newWarmup),
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Updated account limits & warm-up level!');
        setEditingLimitAccount(null);
        fetchAccountsAndSent();
      } else {
        showToast('error', data.error || 'Failed to update limits');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Limit update failed');
    } finally {
      setSavingLimits(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testModalAccount || !testRecipient.trim()) return;
    setIsSendingTest(true);
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_test',
          accountId: testModalAccount.id,
          toEmail: testRecipient.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Test email dispatched to ${testRecipient}!`);
        setTestModalAccount(null);
        setTestRecipient('');
        fetchAccountsAndSent();
      } else {
        showToast('error', data.error || 'Failed to send test email');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Test dispatch failed');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
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
            <span>Multi-Account Safe Rotation</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Mail className="w-6 h-6 text-indigo-400" />
            Connected Gmail Accounts
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Rotate inboxes automatically, guard daily volume caps, and enforce progressive domain warm-up schedules.
          </p>
        </div>

        {/* Connect Gmail Action */}
        <div className="flex items-center gap-2.5">
          <a
            href="/api/gmail/oauth?mock_connect=true"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all"
            title="Add an active demo outreach inbox instantly without Google Console configuration"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Quick Connect (Demo Inbox)</span>
          </a>

          <a
            href="/api/gmail/oauth"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 transition-all"
            title="Connect your live Google Workspace or personal Gmail inbox via OAuth2"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Live Gmail</span>
          </a>
        </div>
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Connected Inboxes</span>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-3">{accounts.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {accounts.filter((a) => a.status === 'active').length} active senders
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Daily Capacity</span>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-blue-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-blue-300 mt-3">{totalCapacity}</p>
          <p className="text-[11px] text-slate-500 mt-1">Safe combined outreach cap</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Sent Today</span>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-purple-400">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-purple-300 mt-3">{sentTodayTotal}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {Math.round((sentTodayTotal / Math.max(totalCapacity, 1)) * 100)}% quota utilized
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/15 backdrop-blur-xl">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Account Health</span>
            <div className="p-2 rounded-xl bg-emerald-900/50 border border-emerald-800/60 text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-300 mt-3">100%</p>
          <p className="text-[11px] text-emerald-500 mt-1">0 hard bounces detected</p>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Active Sender Accounts ({accounts.length})
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Encrypted AES-256 tokens at rest
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-sm text-slate-400">Loading connected inboxes...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-16 text-center space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40">
            <Mail className="w-12 h-12 text-slate-600 mx-auto" />
            <div>
              <h3 className="text-base font-semibold text-white">No accounts connected yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Connect your first Gmail account to enable rotated cold email sending.
              </p>
            </div>
            <a
              href="/api/gmail/oauth"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Now</span>
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acct) => {
              const warmupInfo = WARMUP_LEVEL_MAP[acct.warmupLevel || 1] || {
                name: 'Standard Warmup',
                maxDaily: 25,
              };
              const usagePercent = Math.min(
                100,
                Math.round(((acct.sentToday || 0) / Math.max(acct.dailyLimit, 1)) * 100)
              );

              return (
                <div
                  key={acct.id}
                  className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-xl space-y-5 hover:border-slate-700 transition-all"
                >
                  {/* Account Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            acct.status === 'active'
                              ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                              : 'bg-amber-400'
                          }`}
                        />
                        <span className="text-xs font-bold text-white font-mono">
                          {acct.gmailAddress}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {acct.displayName || 'Primary Outreach Sender'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleStatus(acct)}
                        disabled={actionAccountId === acct.id}
                        title={acct.status === 'active' ? 'Pause account' : 'Resume account'}
                        className={`p-2 rounded-xl border text-xs font-medium transition-all disabled:opacity-50 ${
                          acct.status === 'active'
                            ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-amber-400'
                            : 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60'
                        }`}
                      >
                        {actionAccountId === acct.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : acct.status === 'active' ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => handleDeleteAccount(acct.id, acct.gmailAddress)}
                        disabled={actionAccountId === acct.id}
                        title="Disconnect Account"
                        className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-rose-400 hover:border-rose-800/60 transition-all disabled:opacity-50"
                      >
                        {actionAccountId === acct.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-400" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Warmup Level & Quota Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Warmup Stage:</span>
                        <span className="font-semibold text-slate-200">{warmupInfo.name}</span>
                      </span>
                      <span className="font-mono text-slate-300">
                        {acct.sentToday || 0} / {acct.dailyLimit} sent
                      </span>
                    </div>

                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          usagePercent >= 90
                            ? 'bg-rose-500'
                            : usagePercent >= 60
                            ? 'bg-amber-500'
                            : 'bg-gradient-to-r from-indigo-500 to-emerald-400'
                        }`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Account Footer with Actions */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="text-[11px] text-slate-500 font-mono">
                      {acct.lastUsedAt
                        ? `Last send: ${new Date(acct.lastUsedAt).toLocaleTimeString()}`
                        : 'Ready for outreach'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingLimitAccount(acct);
                          setNewLimit(acct.dailyLimit);
                          setNewWarmup(acct.warmupLevel || 1);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-medium flex items-center gap-1"
                      >
                        <Sliders className="w-3 h-3 text-slate-400" />
                        <span>Adjust Limits</span>
                      </button>

                      <button
                        onClick={() => {
                          setTestModalAccount(acct);
                          setTestRecipient('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-300 text-[11px] font-medium flex items-center gap-1"
                      >
                        <Send className="w-3 h-3 text-indigo-400" />
                        <span>Send Test</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Dispatched Emails Log */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            Recent Sent Outreach Log ({sentEmails.length})
          </h2>
          <span className="text-xs text-slate-500">Live thread IDs & message receipts</span>
        </div>

        {sentEmails.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No emails sent yet.</p>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {sentEmails.slice(0, 5).map((mail) => (
              <div key={mail.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-white">{mail.subject}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    To: {mail.toEmail} • From: {mail.fromAccount}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                    {mail.status.toUpperCase()}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    {new Date(mail.sentAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal 1: Adjust Limits & Warmup */}
      {editingLimitAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Adjust Daily Cap & Warmup
              </h3>
              <button
                onClick={() => setEditingLimitAccount(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              Account: {editingLimitAccount.gmailAddress}
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Warmup Schedule Stage:
                </label>
                <select
                  value={newWarmup}
                  onChange={(e) => {
                    const w = Number(e.target.value);
                    setNewWarmup(w);
                    setNewLimit(WARMUP_LEVEL_MAP[w]?.maxDaily || 25);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={1}>Level 1: Week 1 (Max 20/day)</option>
                  <option value={2}>Level 2: Week 2 (Max 30/day)</option>
                  <option value={3}>Level 3: Week 3 (Max 50/day)</option>
                  <option value={4}>Level 4: Week 4+ (Max 80/day)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Custom Daily Send Cap:
                </label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={newLimit}
                  onChange={(e) => setNewLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Cold outreach recommended: 20-50/day to prevent Google spam filters.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingLimitAccount(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLimits}
                disabled={savingLimits}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all"
              >
                {savingLimits ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : null}
                <span>{savingLimits ? 'Saving...' : 'Save Limits'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Send Test Email */}
      {testModalAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-400" />
                Send Deliverability Test Email
              </h3>
              <button
                onClick={() => setTestModalAccount(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Dispatches an immediate test email through <span className="text-white font-mono">{testModalAccount.gmailAddress}</span> to verify deliverability, SPF/DKIM headers, and inbox placement.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Recipient Email:
              </label>
              <input
                type="email"
                placeholder="your.personal@gmail.com"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setTestModalAccount(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTestEmail}
                disabled={isSendingTest || !testRecipient.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {isSendingTest ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{isSendingTest ? 'Dispatching...' : 'Send Test Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
