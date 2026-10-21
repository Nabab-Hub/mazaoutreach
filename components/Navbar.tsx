'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth-context';
import {
  Shield,
  Sparkles,
  Bell,
  UserCircle,
  LogIn,
  LogOut,
  Flame,
  AlertTriangle,
  MailCheck,
  Check,
  ExternalLink,
  X,
} from 'lucide-react';
import { AppNotification } from '@/lib/types';

export function Navbar() {
  const { user, signInWithGoogle, logout, isDemoUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success && data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsSigningIn(false);
    }
  };

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
      <div className="flex items-center gap-3 relative" ref={dropdownRef}>
        {/* Instant Alert bell */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          title="Instant Alerts & Notification Feed"
          className={`p-2 rounded-xl transition-all relative ${
            isOpen
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
          }`}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-rose-500/40 animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Dropdown Panel */}
        {isOpen && (
          <div className="absolute right-0 top-12 w-80 sm:w-96 rounded-2xl bg-slate-950/95 border border-slate-800/90 shadow-2xl shadow-black/80 backdrop-blur-2xl z-50 overflow-hidden divide-y divide-slate-800/60 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Instant Alerts & Activity</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/40">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No notifications yet. Inbound replies & alerts will appear here.
                </div>
              ) : (
                notifications.map((notif) => {
                  return (
                    <div
                      key={notif.id}
                      className={`p-3.5 transition-colors flex items-start gap-3 ${
                        notif.read ? 'bg-transparent opacity-75' : 'bg-indigo-950/20'
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {notif.type === 'lead_interested' && (
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                            <Flame className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {notif.type === 'needs_human' && (
                          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {notif.type === 'followup_sent' && (
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                            <MailCheck className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {notif.type === 'system' && (
                          <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-white truncate">
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-slate-500 whitespace-nowrap ml-2">
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                          {notif.message}
                        </p>

                        <div className="flex items-center gap-3 mt-2">
                          {notif.link && (
                            <Link
                              href={notif.link}
                              onClick={() => {
                                handleMarkAsRead(notif.id);
                                setIsOpen(false);
                              }}
                              className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
                            >
                              <span>View Details</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                          {!notif.read && (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="text-[10px] text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 ml-auto"
                            >
                              <Check className="w-3 h-3" />
                              <span>Mark read</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-slate-900/60 text-center">
              <Link
                href="/pipeline"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-medium text-slate-400 hover:text-indigo-300 transition-colors"
              >
                Go to Interested Leads Pipeline →
              </Link>
            </div>
          </div>
        )}

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
              title="Sign Out / Switch Account"
              className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-medium transition-all shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{isSigningIn ? 'Signing in...' : 'Sign In'}</span>
          </button>
        )}
      </div>
    </header>
  );
}
