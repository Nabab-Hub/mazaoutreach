import { NextRequest, NextResponse } from 'next/server';
import { AppNotification } from '@/lib/types';
import { getReplies } from '@/lib/firebase/replies';
import { getLeads } from '@/lib/firebase/leads';

// Global mock notifications store for session persistence
declare global {
  var __mockNotifications: AppNotification[] | undefined;
}

if (!globalThis.__mockNotifications) {
  globalThis.__mockNotifications = [
    {
      id: 'notif-1',
      title: '🔥 Hot Lead Detected!',
      message: 'Nexus Fitness replied: "Send over your calendar link or availability for 10 min call"',
      type: 'lead_interested',
      leadId: 'lead-1',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      link: '/pipeline',
    },
    {
      id: 'notif-2',
      title: '⚠️ Human Approval Needed',
      message: 'Aura Aesthetics asked about pricing & technical commitments.',
      type: 'needs_human',
      leadId: 'lead-4',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      link: '/approvals',
    },
    {
      id: 'notif-3',
      title: '✉️ Automated Follow-up Dispatched',
      message: 'Day 3 follow-up delivered to Urban Roast Coffee.',
      type: 'followup_sent',
      leadId: 'lead-3',
      read: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      link: '/leads',
    },
  ];
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      notifications: globalThis.__mockNotifications || [],
      unreadCount: (globalThis.__mockNotifications || []).filter((n) => !n.read).length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id } = body;

    if (action === 'mark_read' && id) {
      if (globalThis.__mockNotifications) {
        const item = globalThis.__mockNotifications.find((n) => n.id === id);
        if (item) item.read = true;
      }
    } else if (action === 'mark_all_read') {
      if (globalThis.__mockNotifications) {
        globalThis.__mockNotifications.forEach((n) => (n.read = true));
      }
    } else if (action === 'clear_all') {
      globalThis.__mockNotifications = [];
    }

    return NextResponse.json({
      success: true,
      notifications: globalThis.__mockNotifications || [],
      unreadCount: (globalThis.__mockNotifications || []).filter((n) => !n.read).length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
