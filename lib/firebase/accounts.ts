import { EmailAccount } from '../types';
import { getAdminDb } from './admin';
import { encryptToken, decryptToken } from '../crypto/encryption';

// In-memory demo email accounts
let mockAccounts: EmailAccount[] = [
  {
    id: 'acct-1',
    gmailAddress: 'alex.consulting@gmail.com',
    displayName: 'Alex Vance (Primary Consult)',
    encryptedRefreshToken: encryptToken('mock_refresh_token_acct_1'),
    dailyLimit: 30,
    sentToday: 12,
    status: 'active',
    warmupLevel: 3,
    lastUsedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
  },
  {
    id: 'acct-2',
    gmailAddress: 'alex.techlead@gmail.com',
    displayName: 'Alex Vance (Tech Lead)',
    encryptedRefreshToken: encryptToken('mock_refresh_token_acct_2'),
    dailyLimit: 25,
    sentToday: 8,
    status: 'active',
    warmupLevel: 2,
    lastUsedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 24 * 15).toISOString(),
  },
];

export async function getAccounts(): Promise<EmailAccount[]> {
  const db = getAdminDb();
  if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    try {
      const snap = await db.collection('email_accounts').orderBy('createdAt', 'desc').get();
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as EmailAccount));
    } catch (err) {
      console.warn('[Accounts] Firestore read failed, falling back to mock:', err);
    }
  }
  return [...mockAccounts];
}

export async function getAccountById(id: string): Promise<EmailAccount | null> {
  const accounts = await getAccounts();
  return accounts.find((a) => a.id === id) || null;
}

export async function saveAccount(account: EmailAccount): Promise<EmailAccount> {
  const db = getAdminDb();
  if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    try {
      await db.collection('email_accounts').doc(account.id).set(account);
    } catch (err) {
      console.warn('[Accounts] Firestore write failed:', err);
    }
  }

  const idx = mockAccounts.findIndex((a) => a.id === account.id);
  if (idx !== -1) {
    mockAccounts[idx] = account;
  } else {
    mockAccounts.push(account);
  }
  return account;
}

export async function updateAccount(id: string, updates: Partial<EmailAccount>): Promise<EmailAccount> {
  const account = await getAccountById(id);
  if (!account) {
    throw new Error(`Account ${id} not found`);
  }

  const updated: EmailAccount = {
    ...account,
    ...updates,
  };

  const db = getAdminDb();
  if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    try {
      await db.collection('email_accounts').doc(id).update(updates);
    } catch (err) {
      console.warn('[Accounts] Firestore update failed:', err);
    }
  }

  const idx = mockAccounts.findIndex((a) => a.id === id);
  if (idx !== -1) {
    mockAccounts[idx] = updated;
  }
  return updated;
}

export async function deleteAccount(id: string): Promise<boolean> {
  const db = getAdminDb();
  if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    try {
      await db.collection('email_accounts').doc(id).delete();
    } catch (err) {
      console.warn('[Accounts] Firestore delete failed:', err);
    }
  }

  const prev = mockAccounts.length;
  mockAccounts = mockAccounts.filter((a) => a.id !== id);
  return mockAccounts.length < prev;
}

export async function incrementAccountSent(id: string): Promise<void> {
  const account = await getAccountById(id);
  if (!account) return;

  const sentToday = (account.sentToday || 0) + 1;
  const now = new Date().toISOString();

  await updateAccount(id, {
    sentToday,
    lastUsedAt: now,
  });
}

export async function recordAccountError(id: string, errorMessage: string): Promise<void> {
  const account = await getAccountById(id);
  if (!account) return;

  const errorCount = (account.errorCount || 0) + 1;
  const shouldPause = errorCount >= 3;

  await updateAccount(id, {
    errorCount,
    lastErrorMessage: errorMessage,
    status: shouldPause ? 'paused' : account.status,
  });
}

export async function resetDailyQuotas(): Promise<void> {
  const accounts = await getAccounts();
  for (const acct of accounts) {
    await updateAccount(acct.id, { sentToday: 0 });
  }
}
