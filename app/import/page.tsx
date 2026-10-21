'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  Download,
  ArrowRight,
  RefreshCw,
  Info,
  FileText,
  X,
  Sparkles,
} from 'lucide-react';

interface ImportSummary {
  batchId: string;
  filename: string;
  totalRows: number;
  imported: number;
  draftsGenerated?: number;
  duplicatesCount: number;
  invalidCount: number;
  enrichedCount?: number;
  enrichmentDetails?: Array<{ row: number; email: string; fields: string[]; summary: string }>;
  sampleValid?: Array<any>;
  duplicates: Array<{ row: number; email: string; reason: string }>;
  invalidRows: Array<{ row: number; email?: string; reason: string }>;
}

const SAMPLE_CSV = `name,email,business,niche,company_description,city,website,notes
Vikram Joshi,vikram@mumbaicricketacademy.org,Mumbai Premier Cricket Academy,club,Elite cricket coaching academy conducting youth leagues and corporate tournaments,Mumbai,https://mumbaicricketacademy.org,Needs modern registration portal and batch slot booking.
Natasha Roy,natasha@artofnatasha.com,Art of Natasha,creator,Digital watercolor artist and content creator with 150k YouTube subscribers selling online masterclasses,Bengaluru,https://artofnatasha.com,Looking to launch an exclusive community membership platform.
Dr. Anjali Verma,contact@vermaskincareclinic.in,Verma Dermatology & Laser Clinic,clinic,Advanced clinical skincare dermatology and cosmetic laser treatments center,Delhi,https://vermaskincareclinic.in,Wants automated patient appointment confirmations via WhatsApp.
Sameer Khan,owner@khanartisansweets.com,Khan Artisan Sweets & Bakery,shop,Premium gourmet bakery and Indian sweets confectionery store,Hyderabad,https://khanartisansweets.com,Looking for an online ordering system for corporate festival gift packs.
Kavita Sen,kavita@sensolutions.tech,Sen Automation Systems,other,Industrial IoT systems integrator designing factory workflow monitoring sensors,Pune,https://sensolutions.tech,Interested in customer support AI chatbot and backend API integrations.
Duplicate Test,vikram@mumbaicricketacademy.org,Duplicate Club,club,Test duplicate description,Mumbai,,Testing duplicate rejection
Invalid Email Test,bademail-without-at-sign,Bad Email Shop,shop,Invalid email description,Kolkata,,Testing syntax validation
`;

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState('');
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [autoEnrich, setAutoEnrich] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_client_leads.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv') || file.type === 'text/csv') {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please drop a valid .csv file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleImportSubmit = async () => {
    setError(null);
    setUploading(true);
    try {
      let res: Response;
      if (inputMode === 'upload') {
        if (!selectedFile) {
          setError('Please select or drop a CSV file first.');
          setUploading(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('autoEnrich', String(autoEnrich));
        res = await fetch('/api/import', {
          method: 'POST',
          body: formData,
        });
      } else {
        if (!csvText.trim()) {
          setError('Please paste raw CSV text.');
          setUploading(false);
          return;
        }
        res = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csvContent: csvText, filename: 'pasted_leads.csv', autoEnrich }),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to process import.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred during import.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadErrorReport = () => {
    if (!result) return;
    const errors = [
      ...result.invalidRows.map((e) => ({
        Type: 'Invalid Email/Format',
        Row: e.row,
        Email: e.email || '',
        Reason: e.reason,
      })),
      ...result.duplicates.map((d) => ({
        Type: 'Duplicate/Suppressed',
        Row: d.row,
        Email: d.email,
        Reason: d.reason,
      })),
    ];

    const header = 'Type,Row,Email,Reason\n';
    const rows = errors
      .map(
        (e) =>
          `"${e.Type}","${e.Row}","${e.Email}","${e.Reason.replace(/"/g, '""')}"`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `import_errors_${result.batchId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <UploadCloud className="w-6 h-6 text-indigo-400" />
            Import Leads from CSV
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Automatic header mapping, email validation, suppression check, and deduplication.
          </p>
        </div>
        <button
          onClick={handleDownloadSample}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all"
        >
          <Download className="w-4 h-4 text-indigo-400" />
          <span>Download Sample CSV</span>
        </button>
      </div>

      {/* Input Mode Selector */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setInputMode('upload')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
            inputMode === 'upload'
              ? 'border-indigo-500 text-indigo-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Upload CSV File
        </button>
        <button
          onClick={() => setInputMode('paste')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
            inputMode === 'paste'
              ? 'border-indigo-500 text-indigo-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Paste Raw CSV
        </button>
      </div>

      {/* Main Upload Zone */}
      {!result ? (
        <div className="space-y-6">
          {inputMode === 'upload' ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : selectedFile
                  ? 'border-emerald-500/60 bg-emerald-950/15'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-7 h-7 text-indigo-400" />
              </div>

              {selectedFile ? (
                <div>
                  <p className="text-sm font-semibold text-emerald-400 flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Click to choose another file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Drag and drop your client leads CSV here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Required: <span className="text-indigo-300 font-mono">name, email</span>. Recommended: <span className="text-purple-300 font-mono">company_description</span> (used by AI to generate tailored pitches). Optional: <span className="text-slate-300 font-mono">business, niche, city, website, notes</span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Paste CSV Contents
              </label>
              <textarea
                rows={10}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="name,email,business,niche,company_description,city,website,notes&#10;John Doe,john@example.com,Doe Fitness,club,Premier athletic gym and wellness club with 500 active members,London,https://example.com,Looking for booking system"
                className="w-full p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* AI Niche Prediction & Safe Auto-Fill Toggle */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 to-slate-900/60 border border-purple-500/30 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-900/60 border border-purple-700/50 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-purple-300" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>AI Niche Prediction & Safe Auto-Fill</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-900/60 text-purple-300 border border-purple-700/40">
                    Smart Inspection
                  </span>
                </div>
                <p className="text-[11px] text-purple-300/80 mt-0.5">
                  Analyzes business context to predict missing niches and suggest operational pain points. Safe: never invents private contact details or addresses.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoEnrich}
              onClick={() => setAutoEnrich(!autoEnrich)}
              className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full p-0.5 border transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                autoEnrich
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-400/60 shadow-lg shadow-purple-600/30'
                  : 'bg-slate-800 border-slate-700 hover:border-slate-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                  autoEnrich ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={handleImportSubmit}
              disabled={uploading || (inputMode === 'upload' && !selectedFile)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Inspecting, Predicting & Deduplicating...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Process & Import Leads</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Import Summary Card */
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Import Batch Completed</h2>
                  <p className="text-xs text-slate-400">File: {result.filename}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setResult(null);
                    setSelectedFile(null);
                    setCsvText('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs transition-colors"
                >
                  Import Another CSV
                </button>
                {result.draftsGenerated && result.draftsGenerated > 0 ? (
                  <Link
                    href="/queue"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/25 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Review {result.draftsGenerated} AI Drafts</span>
                  </Link>
                ) : null}
                <Link
                  href="/leads"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
                >
                  <span>View All Leads</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Metric Grid */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-6">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Total Rows
                </p>
                <p className="text-2xl font-bold text-white mt-1">{result.totalRows}</p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                  Imported (Valid)
                </p>
                <p className="text-2xl font-bold text-emerald-300 mt-1">{result.imported}</p>
              </div>

              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/40">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>Drafts Generated</span>
                </p>
                <p className="text-2xl font-bold text-purple-300 mt-1">
                  {result.draftsGenerated ?? 0}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/40">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>AI Enriched</span>
                </p>
                <p className="text-2xl font-bold text-indigo-300 mt-1">
                  {result.enrichedCount ?? 0}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                  Duplicates
                </p>
                <p className="text-2xl font-bold text-amber-300 mt-1">
                  {result.duplicatesCount}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/40">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">
                  Invalid Syntax
                </p>
                <p className="text-2xl font-bold text-rose-300 mt-1">{result.invalidCount}</p>
              </div>
            </div>
          </div>

          {/* AI Auto-Enrichment & Niche Prediction Report */}
          {result.enrichedCount && result.enrichedCount > 0 && result.enrichmentDetails && result.enrichmentDetails.length > 0 && (
            <div className="p-6 rounded-2xl border border-purple-500/30 bg-purple-950/20 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-900/60 border border-purple-700/50 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>AI Inspection & Auto-Fill Report</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-900/60 text-purple-300 border border-purple-700/50">
                        {result.enrichedCount} Leads Enriched
                      </span>
                    </h3>
                    <p className="text-xs text-purple-300/80 mt-0.5">
                      The AI inspected each row, predicted missing niches, and generated operational context. Private contact info was strictly preserved.
                    </p>
                  </div>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-xl border border-purple-800/40 bg-slate-900/80 text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-950/80 border-b border-purple-800/30 text-[10px] uppercase font-semibold text-purple-300 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-4 w-16">Row</th>
                      <th className="py-2.5 px-4">Lead Email</th>
                      <th className="py-2.5 px-4">Auto-Filled Fields</th>
                      <th className="py-2.5 px-4">AI Change Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-950/40 text-xs">
                    {result.enrichmentDetails.map((item, idx) => (
                      <tr key={`enr-${idx}`} className="hover:bg-purple-950/30 transition-colors">
                        <td className="py-2 px-4 font-mono text-purple-400">#{item.row}</td>
                        <td className="py-2 px-4 font-mono text-slate-300">{item.email}</td>
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.fields.map((f) => (
                              <span
                                key={f}
                                className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-purple-950/80 text-purple-200 border border-purple-800/50"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 px-4 text-purple-200 font-sans text-xs">
                          {item.summary}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Error & Duplicate Details Report */}
          {(result.invalidCount > 0 || result.duplicatesCount > 0) && (
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/40">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Validation & Deduplication Report
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {result.invalidCount + result.duplicatesCount} rows were excluded to protect deliverability.
                  </p>
                </div>
                <button
                  onClick={handleDownloadErrorReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Download Error Report (.csv)</span>
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-900/60 text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-950/60 border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-400 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-4">Row</th>
                      <th className="py-2.5 px-4">Email</th>
                      <th className="py-2.5 px-4">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {result.invalidRows.map((e, idx) => (
                      <tr key={`inv-${idx}`} className="text-rose-300">
                        <td className="py-2 px-4">{e.row}</td>
                        <td className="py-2 px-4">{e.email || '—'}</td>
                        <td className="py-2 px-4 font-sans text-xs">{e.reason}</td>
                      </tr>
                    ))}
                    {result.duplicates.map((d, idx) => (
                      <tr key={`dup-${idx}`} className="text-amber-300">
                        <td className="py-2 px-4">{d.row}</td>
                        <td className="py-2 px-4">{d.email}</td>
                        <td className="py-2 px-4 font-sans text-xs">{d.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Helper Guideline Card */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-start gap-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-slate-300 font-semibold">How CSV Import Works in Phase 1</p>
          <p>
            1. Every row is parsed and checked against the suppression list and existing database.
          </p>
          <p>
            2. If the <span className="font-mono text-slate-300">niche</span> column is omitted, the agent automatically infers it (club, creator, shop, clinic, or other).
          </p>
          <p>
            3. All successfully validated leads are assigned status <span className="font-mono text-emerald-300">new</span>, ready for Phase 2 personalization drafting.
          </p>
        </div>
      </div>
    </div>
  );
}
