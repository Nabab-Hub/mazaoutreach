'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UploadCloud,
  Users,
  CheckSquare,
  GitPullRequest,
  Mail,
  FileCode2,
  Settings,
  BarChart3,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: any;
  highlight?: boolean;
  badge?: string;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/import', label: 'Import CSV', icon: UploadCloud, highlight: true },
  { href: '/leads', label: 'All Leads', icon: Users },
  { href: '/approvals', label: 'Approval Queue', icon: CheckSquare, highlight: true },
  { href: '/templates', label: 'Niche Templates', icon: FileCode2 },
  { href: '/accounts', label: 'Gmail Accounts', icon: Mail },
  { href: '/pipeline', label: 'Interested Pipeline', icon: GitPullRequest },
  { href: '/settings', label: 'Settings & AI Routing', icon: Settings },
  { href: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-950/60 backdrop-blur-xl flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/60">
        <div className="w-9 h-9 rounded-xl overflow-hidden border border-indigo-500/30 shadow-lg shadow-indigo-500/25 shrink-0 bg-slate-900">
          <img
            src="/logo.png"
            alt="Agentic Outreach"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
            Agentic Outreach
          </h1>
          <p className="text-[11px] text-indigo-400 font-medium">Autonomous Outreach OS</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="p-4 space-y-1.5 flex-1">
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Core Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group',
                isActive
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-semibold shadow-sm shadow-indigo-950'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                  )}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-slate-700/50">
                  {item.badge}
                </span>
              )}
              {item.highlight && !item.badge && (
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Autonomy Level Pill (Section 5.7) */}
      <div className="p-4 border-t border-slate-800/60">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Safety Mode
            </span>
            <span className="font-semibold text-emerald-400 text-[11px]">Level L0</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Approval-first active. All initial emails & replies await manual verification.
          </p>
        </div>
      </div>
    </aside>
  );
}
