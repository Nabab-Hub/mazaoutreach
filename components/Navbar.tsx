'use client';

import React from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { Shield, Sparkles, Bell, UserCircle, LogIn, LogOut } from 'lucide-react';

export function Navbar() {
  const { user, signInWithGoogle, logout, isDemoUser } = useAuth();

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Left Status Indicators */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-950/40 border border-indigo-800/50 text-indigo-300 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Multi-Provider AI Ready</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 text-xs">
          <span className="text-slate-400">Warm-up Quota:</span>
          <span className="font-semibold text-slate-200">20/day per account</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Instant Alert bell */}
        <button
          title="Instant Alerts Active (Email + Telegram)"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500"></span>
        </button>

        {/* User / Demo Mode State */}
        {user ? (
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-md">
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'O'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-slate-200 truncate max-w-[140px]">
                {user.displayName || user.email}
              </p>
              <p className="text-[10px] text-emerald-400 font-mono">
                {isDemoUser ? 'Demo Workspace' : 'Authenticated Owner'}
              </p>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition-colors ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => signInWithGoogle()}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-md shadow-indigo-600/20"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
