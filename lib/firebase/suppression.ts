import { SuppressionEntry } from '../types';
import { getAdminDb } from './admin';

const globalForSuppression = globalThis as unknown as {
  __mockSuppressionList?: SuppressionEntry[];
};

let mockSuppressionList: SuppressionEntry[] = globalForSuppression.__mockSuppressionList || [
  {
    email: 'unsubscribed.lead@example.com',
    reason: 'user_requested',
    addedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
  {
    email: 'bounced.inbox@invalidcorp.com',
    reason: 'hard_bounce',
    addedAt: new Date(Date.now() - 3600000 * 24 * 12).toISOString(),
  },
];
globalForSuppression.__mockSuppressionList = mockSuppressionList;

export async function getSuppressionEntries(): Promise<SuppressionEntry[]> {
  const db = getAdminDb();
  if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    try {
      const snap = await db.collection('suppression').orderBy('addedAt', 'desc').get();
      return snap.docs.map((d) => ({ email: d.id, ...d.data() } as SuppressionEntry));
    } catch (e) {
      console.warn('[Suppression] Firestore read failed, using mock store:', e);
    }
  }
  return [...(globalForSuppression.__mockSuppressionList || mockSuppressionList)];
}

export async function addSuppressedEmail(
  email: string,
  reason: 'user_requested' | 'hard_bounce' | 'complaint' | 'manual' = 'user_requested',
  leadId?: string
): Promise<SuppressionEntry> {
  const normalized = email.toLowerCase().trim();
  const entry: SuppressionEntry = {
    email: normalized,
    reason,
    addedAt: new Date().toISOString(),
    leadId,
  };

  const db = getAdminDb();
  if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    try {
      await db.collection('suppression').doc(normalized).set(entry);
    } catch (e) {
      console.warn('[Suppression] Firestore write failed:', e);
    }
  }

  mockSuppressionList = globalForSuppression.__mockSuppressionList || mockSuppressionList;
  const existingIdx = mockSuppressionList.findIndex((s) => s.email === normalized);
  if (existingIdx !== -1) {
    mockSuppressionList[existingIdx] = entry;
  } else {
    mockSuppressionList.unshift(entry);
  }
  globalForSuppression.__mockSuppressionList = mockSuppressionList;

  return entry;
}

export async function removeSuppressedEmail(email: string): Promise<boolean> {
  const normalized = email.toLowerCase().trim();
  const db = getAdminDb();
  if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    try {
      await db.collection('suppression').doc(normalized).delete();
    } catch (e) {
      console.warn('[Suppression] Firestore delete failed:', e);
    }
  }

  const prevLen = mockSuppressionList.length;
  mockSuppressionList = mockSuppressionList.filter((s) => s.email !== normalized);
  return mockSuppressionList.length < prevLen;
}
