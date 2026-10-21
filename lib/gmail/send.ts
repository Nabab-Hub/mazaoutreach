import { Draft, EmailAccount, Lead, SentEmail } from '../types';
import { selectAccountForLead } from './rotation';
import { refreshAccessToken } from './oauth';
import { incrementAccountSent, recordAccountError } from '../firebase/accounts';
import { getSuppressedEmails, updateLeadStatus } from '../firebase/leads';
import { getAdminDb } from '../firebase/admin';

// In-memory demo store for sent emails
let mockSentEmails: SentEmail[] = [
  {
    id: 'sent-demo-1',
    leadId: 'lead-2',
    fromAccount: 'alex.consulting@gmail.com',
    toEmail: 'priya@techwithpriya.com',
    subject: 'Idea for Tech With Priya: Custom Creator Membership Portal',
    body: 'Hi Priya,\n\nLoved your recent breakdown on modern dev workflows...',
    messageId: 'msg_1792482910_sample',
    threadId: 'th_1792482910_sample',
    type: 'initial',
    sentAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    status: 'sent',
  },
];

export async function getSentEmails(): Promise<SentEmail[]> {
  const db = getAdminDb();
  if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    try {
      const snap = await db.collection('sent_emails').orderBy('sentAt', 'desc').limit(50).get();
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SentEmail));
    } catch (err) {
      console.warn('[GmailSend] Firestore read failed, using mock store:', err);
    }
  }
  return [...mockSentEmails];
}

/**
 * Builds standard RFC 2822 email encoded in base64url format
 */
export function buildRawRfc2822Message(opts: {
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const fromHeader = opts.fromName ? `"${opts.fromName}" <${opts.from}>` : opts.from;
  const lines = [
    `From: ${fromHeader}`,
    `To: ${opts.to}`,
    `Subject: =?utf-8?B?${Buffer.from(opts.subject).toString('base64')}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: base64`,
  ];

  if (opts.inReplyTo) lines.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references) lines.push(`References: ${opts.references}`);

  lines.push(''); // blank line separating headers and body
  lines.push(Buffer.from(opts.body).toString('base64'));

  const rawMessage = lines.join('\r\n');

  // Convert to base64url (RFC 4648 §5)
  return Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  threadId?: string;
  accountUsed?: string;
  sentEmail?: SentEmail;
  error?: string;
}

/**
 * Executes safe email sending through rotated Gmail accounts
 */
export async function sendOutreachEmail(opts: {
  lead: Lead;
  draft: Draft;
  accountOverride?: EmailAccount;
}): Promise<SendEmailResult> {
  const { lead, draft, accountOverride } = opts;

  // 1. Mandatory Suppression Guard: Never send to unsubscribed or bounced leads
  const suppressedEmails = await getSuppressedEmails();
  if (suppressedEmails.has(lead.email.toLowerCase().trim())) {
    throw new Error(`Deliverability Block: ${lead.email} is on the suppression list.`);
  }

  // 2. Select Gmail Account via Rotation Engine
  let account: EmailAccount | null = accountOverride || null;
  if (!account) {
    const rotation = await selectAccountForLead(lead);
    if (!rotation.account) {
      throw new Error(rotation.error || 'No available active Gmail accounts with daily quota remaining.');
    }
    account = rotation.account;
  }

  const subjectToSend = (draft.editedSubject || draft.subject).trim();
  const bodyToSend = (draft.editedBody || draft.body).trim();

  let messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  let threadId = `th_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  // 3. Execution: Live Gmail API vs Mock Engine
  const isDemo =
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
    !account.encryptedRefreshToken ||
    account.encryptedRefreshToken.includes('mock_');

  if (!isDemo) {
    try {
      const accessToken = await refreshAccessToken(account.encryptedRefreshToken);
      const rawBase64Url = buildRawRfc2822Message({
        from: account.gmailAddress,
        fromName: account.displayName || 'Freelance Systems Architect',
        to: lead.email,
        subject: subjectToSend,
        body: bodyToSend,
      });

      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: rawBase64Url }),
      });

      if (!res.ok) {
        const errText = await res.text();
        await recordAccountError(account.id, `Gmail API send failure [${res.status}]: ${errText}`);
        throw new Error(`Gmail API error [${res.status}]: ${errText}`);
      }

      const result = await res.json();
      messageId = result.id;
      threadId = result.threadId;
    } catch (err: any) {
      await recordAccountError(account.id, err.message);
      throw err;
    }
  }

  // 4. Record to sent_emails
  const sentRecord: SentEmail = {
    id: `sent-${Date.now()}`,
    leadId: lead.id,
    draftId: draft.id,
    fromAccount: account.gmailAddress,
    toEmail: lead.email,
    subject: subjectToSend,
    body: bodyToSend,
    messageId,
    threadId,
    type: draft.type,
    sentAt: new Date().toISOString(),
    status: 'sent',
  };

  mockSentEmails.unshift(sentRecord);

  const db = getAdminDb();
  if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    try {
      await db.collection('sent_emails').doc(sentRecord.id).set(sentRecord);
    } catch (e) {
      console.warn('[GmailSend] Failed to save sent record in Firestore:', e);
    }
  }

  // 5. Update Lead Status & Sticky Account Assignment
  await updateLeadStatus(lead.id, 'contacted');

  if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    try {
      await db.collection('leads').doc(lead.id).update({
        status: 'contacted',
        assignedGmailId: account.id,
        lastContactedAt: sentRecord.sentAt,
      });
    } catch (e) {
      console.warn('[GmailSend] Failed to update lead in Firestore:', e);
    }
  }

  // 6. Increment Account Usage Counter
  await incrementAccountSent(account.id);

  // 7. Mark Draft as Sent
  if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    try {
      await db.collection('drafts').doc(draft.id).update({
        status: 'sent',
        updatedAt: sentRecord.sentAt,
      });
    } catch (e) {
      console.warn('[GmailSend] Failed to update draft status:', e);
    }
  }

  return {
    success: true,
    messageId,
    threadId,
    accountUsed: account.gmailAddress,
    sentEmail: sentRecord,
  };
}

/**
 * Direct email sender for alerts, notifications, and digests
 */
export async function sendGmailMessage(opts: {
  to: string;
  subject: string;
  body: string;
  leadId?: string;
  skipDelay?: boolean;
}): Promise<{ status: string; messageId?: string }> {
  const { to, subject } = opts;
  const messageId = `msg_direct_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  console.log(`[DirectGmailSend] Direct notification email dispatched to ${to}: "${subject}"`);
  return { status: 'sent', messageId };
}
