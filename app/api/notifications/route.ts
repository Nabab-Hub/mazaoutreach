import { NextRequest, NextResponse } from 'next/server';
import { AppNotification } from '@/lib/types';
import { startInboxPollerDaemon } from '@/lib/gmail/poll';
import { getAdminDb } from '@/lib/firebase/admin';

// Global mock notifications store for session persistence
declare global {
  var __mockNotifications: AppNotification[] | undefined;
}

if (!globalThis.__mockNotifications) {
  globalThis.__mockNotifications = [];
}

export async function GET() {
  try {
    startInboxPollerDaemon();

    let notifs: AppNotification[] = globalThis.__mockNotifications || [];
    const db = getAdminDb();
    if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
      try {
        const snap = await db.collection('notifications').orderBy('createdAt', 'desc').limit(30).get();
        if (!snap.empty) {
          const dbNotifs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AppNotification));
          notifs = dbNotifs;
          globalThis.__mockNotifications = dbNotifs;
        }
      } catch (e) {
        // Fall back to memory
      }
    }

    return NextResponse.json({
      success: true,
      notifications: notifs,
      unreadCount: notifs.filter((n) => !n.read).length,
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
