import React from 'react';
import Link from 'next/link';
import { Scale, ShieldAlert, CheckCircle2, ArrowLeft, Mail, AlertTriangle } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | Agentic Outreach Platform',
  description: 'Terms of Service, acceptable use policy, and compliance standards for Agentic Outreach platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200 py-12 px-6 lg:px-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Header */}
        <div className="border-b border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 text-xs font-medium mb-3">
            <Scale className="w-3.5 h-3.5 text-indigo-400" />
            <span>Platform Agreement & Usage Guidelines</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Terms of Service</h1>
          <p className="text-slate-400 text-sm mt-2">
            Last updated: October 21, 2026 • Effective immediately
          </p>
        </div>

        {/* Key Rules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-white mb-1">Human-in-the-Loop</h2>
            <p className="text-xs text-slate-400">
              Users retain ultimate responsibility for approving cold outreach emails, ensuring tone accuracy and pricing sanity before dispatch.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center mb-3">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-white mb-1">Quota & Rate Limits</h2>
            <p className="text-xs text-slate-400">
              Accounts are governed by conservative warm-up sending rules (20-30 emails/day per connected Gmail) to safeguard sender reputation.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center mb-3">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-white mb-1">Zero Tolerance Spam</h2>
            <p className="text-xs text-slate-400">
              Purchased scraped consumer lists, phishing, deceptive headers, or ignoring opt-out notices results in immediate account suspension.
            </p>
          </div>
        </div>

        {/* Detailed Terms */}
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 md:p-8">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Agentic Outreach platform, connecting Google accounts, or utilizing our AI-assisted drafting and dispatch systems, you agree to be bound by these Terms of Service and all applicable local, national, and international laws.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">2. Acceptable Use Policy (AUP)</h2>
            <p>
              Agentic Outreach is strictly intended for targeted, B2B commercial outreach to relevant prospective business clients. You agree that you will NOT:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
              <li>Send unsolicited bulk emails (SPAM) to private consumer inboxes without legitimate business interest.</li>
              <li>Circumvent or disable suppression lists or ignore recipient opt-out requests.</li>
              <li>Use deceptive subject lines or misleading headers to conceal the true sender identity.</li>
              <li>Attempt to send malicious attachments, phishing campaigns, or fraudulent solicitations.</li>
              <li>Exceed recommended daily sending caps to artificially bypass Google workspace thresholds.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">3. AI Agent Output & Autonomy Ladder</h2>
            <p>
              The platform provides artificial intelligence capabilities for niche prediction, contextual email drafting, reply classification, and follow-up generation.
            </p>
            <p className="text-xs text-slate-400">
              By default (Autonomy Level L0), all generated drafts require human review and manual approval before transmission. While you may adjust autonomy settings to higher levels as trust builds, you acknowledge that you remain legally responsible for all communications dispatched from your connected accounts.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">4. Connected Accounts & Security</h2>
            <p>
              You must maintain the security of your account credentials. You authorize Agentic Outreach to act on your behalf to send and inspect emails strictly through approved OAuth scopes. You may revoke access to connected Google accounts at any time through your Google Security settings or within the platform&apos;s Gmail Accounts dashboard.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">5. Deliverability & Account Health Disclaimer</h2>
            <p>
              Email delivery rates are influenced by domain DNS records (SPF, DKIM, DMARC), recipient server policies, and past domain reputation. While the platform enforces intelligent sending windows, randomized delays (60-180 seconds), and automatic bounce pausing, Agentic Outreach does not guarantee inbox placement or immunity from provider penalties if policies are violated.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">6. Termination & Limitation of Liability</h2>
            <p>
              We reserve the right to suspend or terminate access to any user engaging in abusive email practices, high complaint rates, or breach of these terms. In no event shall Agentic Outreach be liable for any indirect, incidental, or consequential damages resulting from platform use.
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-800/80">
          <p>© 2026 Agentic Outreach OS. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/" className="hover:text-slate-300 transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
