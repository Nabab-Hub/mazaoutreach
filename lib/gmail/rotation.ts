import { EmailAccount, Lead } from '../types';
import { getAccounts, updateAccount } from '../firebase/accounts';
import { updateLeadStatus } from '../firebase/leads';

export interface RotationResult {
  account: EmailAccount | null;
  error?: string;
}

/**
 * Selects the optimal active Gmail account for a given lead according to multi-account rotation rules:
 * 1. Sticky Account Affinity: If lead already has an assigned Gmail account, re-use it if active & below limit.
 * 2. Least-Utilized Rotation: Otherwise, pick the active account with the lowest (sentToday / dailyLimit) utilization ratio.
 * 3. Daily Limit Guard: Rejects selection if all active accounts are saturated.
 */
export async function selectAccountForLead(lead: Lead): Promise<RotationResult> {
  const accounts = await getAccounts();

  // Auto-recover any account that was paused due to temporary Google API rate limit
  for (const a of accounts) {
    if (
      a.status === 'paused' &&
      a.lastErrorMessage &&
      (a.lastErrorMessage.includes('RATE_LIMIT_EXCEEDED') ||
        a.lastErrorMessage.includes('Units per minute') ||
        a.lastErrorMessage.includes('rateLimitExceeded'))
    ) {
      console.log(`[Rotation] Auto-recovering rate-limited account ${a.gmailAddress}`);
      a.status = 'active';
      a.errorCount = 0;
      await updateAccount(a.id, { status: 'active', errorCount: 0 });
    }
  }

  const activeAccounts = accounts.filter(
    (a) => a.status === 'active' && (a.sentToday || 0) < a.dailyLimit
  );

  if (activeAccounts.length === 0) {
    if (accounts.length === 0) {
      return {
        account: null,
        error: 'No Gmail accounts connected. Please connect a Gmail account in the Accounts tab.',
      };
    }

    const allPaused = accounts.every((a) => a.status === 'paused');
    if (allPaused) {
      return {
        account: null,
        error: `Connected account (${accounts.map((a) => a.gmailAddress).join(', ')}) is currently PAUSED. Go to Accounts tab and click Resume.`,
      };
    }

    const allExhausted = accounts.every((a) => (a.sentToday || 0) >= a.dailyLimit);
    if (allExhausted) {
      return {
        account: null,
        error: `Daily limit reached for all accounts (${accounts.map((a) => `${a.gmailAddress}: ${a.sentToday}/${a.dailyLimit}`).join(', ')}). Increase limit in Accounts tab.`,
      };
    }

    return {
      account: null,
      error: 'No active Gmail accounts available with remaining quota. Check Accounts tab.',
    };
  }

  // 1. Check sticky assignment
  if (lead.assignedGmailId) {
    const existing = activeAccounts.find((a) => a.id === lead.assignedGmailId);
    if (existing) {
      return { account: existing };
    }
    // If the assigned account is saturated or paused, notify but allow fallback
    console.warn(
      `[Rotation] Assigned account ${lead.assignedGmailId} for lead ${lead.id} is unavailable or at quota. Rotating to another active account.`
    );
  }

  // 2. Select account with lowest utilization ratio: (sentToday / dailyLimit)
  activeAccounts.sort((a, b) => {
    const ratioA = (a.sentToday || 0) / Math.max(a.dailyLimit, 1);
    const ratioB = (b.sentToday || 0) / Math.max(b.dailyLimit, 1);
    return ratioA - ratioB;
  });

  const selected = activeAccounts[0];

  return { account: selected };
}

import { WARMUP_LEVEL_MAP } from '../types';
export { WARMUP_LEVEL_MAP };

export function getRecommendedLimitForWarmup(level: number): number {
  return WARMUP_LEVEL_MAP[level]?.maxDaily || 25;
}
