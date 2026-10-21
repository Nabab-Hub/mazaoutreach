import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, Eye, FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | Agentic Outreach Platform',
  description: 'Privacy Policy and data governance practices for Agentic Outreach platform.',
};

export default function PrivacyPage() {
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
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Data Protection & Privacy Policy</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Privacy Policy</h1>
          <p className="text-slate-400 text-sm mt-2">
            Last updated: October 21, 2026 • Effective immediately
          </p>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-3">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-white mb-1">AES-256 Token Encryption</h2>
            <p className="text-xs text-slate-400">
              OAuth refresh tokens are encrypted at rest using server-side keys; credentials are never exposed to browser clients.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-white mb-1">Permanent Suppression</h2>
            <p className="text-xs text-slate-400">
              Opt-out requests (&quot;STOP&quot; / &quot;unsubscribe&quot;) are honored instantly and stored in permanent suppression lists across all accounts.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center mb-3">
              <Eye className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-white mb-1">No PII Hallucination</h2>
            <p className="text-xs text-slate-400">
              AI inspection only predicts public operational context (niche/pain points) and strictly forbids generating fake personal contact data.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 md:p-8">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">1. Information We Collect</h2>
            <p>
              <strong>Lead Data:</strong> Information you import via CSV, including prospect business names, professional email addresses, websites, cities, and custom business notes.
            </p>
            <p>
              <strong>Connected Email Accounts:</strong> When connecting Gmail accounts via Google OAuth2, we collect your authorized email address, display name, and securely encrypt refresh tokens to facilitate email sending, thread tracking, and reply polling.
            </p>
            <p>
              <strong>AI & Learning Logs:</strong> We store draft approval histories, human edit diffs, and classification outcomes to improve few-shot personalization prompt accuracy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">2. Google API Services User Data Policy Compliance</h2>
            <p>
              Our application adheres strictly to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
              <li>Gmail data obtained via Google APIs is used solely to provide and improve email sending and thread classification features.</li>
              <li>We do not transfer your Gmail data to third parties, except as necessary to provide these features or comply with applicable laws.</li>
              <li>We never use or transfer Gmail data to serve advertisements or train generalized, non-user-specific foundational machine learning models.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">3. How Lead Data Is Handled & Safe AI Processing</h2>
            <p>
              When running AI enrichment or personalized draft generation:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
              <li>Only relevant contextual fields (business name, niche, notes, past email snippet) are sent to configured LLM providers (Gemini, OpenAI, Grok).</li>
              <li>Private personal identity keys are filtered out.</li>
              <li>AI agents are constrained to never fabricate private personal addresses, unverified phone numbers, or fraudulent identity data.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">4. Deliverability, Unsubscribe & Suppression Rules</h2>
            <p>
              Every outgoing email sent through Agentic Outreach contains a clear sender identity and a compliant opt-out notice (&quot;Reply STOP to unsubscribe&quot;).
              When a recipient replies requesting an opt-out or unsubscribe:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
              <li>The recipient email is immediately and permanently logged to the account suppression list.</li>
              <li>All ongoing follow-up sequences and queued drafts for that address are canceled.</li>
              <li>Any subsequent CSV import containing that address is automatically blocked before draft generation.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">5. Data Retention & Security</h2>
            <p>
              All customer data is stored in Firestore with strict database security rules ensuring that only authenticated owners can read or write data. In local demo mode, data is maintained strictly in memory on your host system.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-white">6. Contact & Data Deletion Requests</h2>
            <p>
              For any questions regarding this Privacy Policy or to request immediate deletion of all data associated with your account, please reach out via the settings configuration or contact the platform administrator at{' '}
              <span className="text-indigo-400 font-mono">privacy@agenticoutreach.local</span>.
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-800/80">
          <p>© 2026 Agentic Outreach OS. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-slate-300 transition-colors">
              Terms of Service
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
