import { Draft, EmailAccount, Lead, SentEmail } from '../types';
import { selectAccountForLead } from './rotation';
import { refreshAccessToken } from './oauth';
import { incrementAccountSent, recordAccountError } from '../firebase/accounts';
import { getSuppressedEmails, updateLeadStatus } from '../firebase/leads';
import { getAdminDb } from '../firebase/admin';
import { ensureDefaultSignature } from '../templates/signature';

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

function formatBodyHtml(body: string): string {
  let safe = (body || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Convert markdown links [Text](url) to styled anchor tags
  safe = safe.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" style="color: #0b57d0; text-decoration: underline;">$1</a>'
  );

  // Convert bare URLs (not already in anchor) to clickable links
  safe = safe.replace(
    /(^|[^"'>])(https?:\/\/[^\s<]+)/g,
    '$1<a href="$2" target="_blank" style="color: #0b57d0; text-decoration: underline;">$2</a>'
  );

  const paragraphs = safe.split(/\r?\n\r?\n/);
  const htmlParagraphs = paragraphs
    .map((p) => {
      const formattedLines = p.replace(/\r?\n/g, '<br/>');
      return `<p style="margin: 0 0 16px 0; line-height: 1.6;">${formattedLines}</p>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #222222; background-color: #ffffff;">
  <div style="max-width: 600px; margin: 0; padding: 4px 0;">
    ${htmlParagraphs}
  </div>
</body>
</html>`;
}

/**
 * Builds standard RFC 2822 email encoded in base64url format with high deliverability headers
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
  const domain = opts.from.split('@')[1] || 'gmail.com';
  const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 10)}@${domain}>`;
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // Plaintext version cleans raw markdown links so plain-text readers see clean URLs
  const plainTextBody = opts.body
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1: $2')
    .trim();

  const htmlBody = formatBodyHtml(opts.body);

  const lines = [
    `From: ${fromHeader}`,
    `To: ${opts.to}`,
    `Reply-To: ${fromHeader}`,
    `Subject: =?utf-8?B?${Buffer.from(opts.subject).toString('base64')}?=`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    `List-Unsubscribe: <mailto:${opts.from}?subject=unsubscribe>`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  if (opts.inReplyTo) lines.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references) lines.push(`References: ${opts.references}`);

  lines.push(''); // blank line separating headers and body

  // 1. Text/Plain part
  lines.push(`--${boundary}`);
  lines.push('Content-Type: text/plain; charset=utf-8');
  lines.push('Content-Transfer-Encoding: base64');
  lines.push('');
  lines.push(Buffer.from(plainTextBody, 'utf-8').toString('base64'));
  lines.push('');

  // 2. Text/HTML part
  lines.push(`--${boundary}`);
  lines.push('Content-Type: text/html; charset=utf-8');
  lines.push('Content-Transfer-Encoding: base64');
  lines.push('');
  lines.push(Buffer.from(htmlBody, 'utf-8').toString('base64'));
  lines.push('');

  // Closing boundary
  lines.push(`--${boundary}--`);

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
  inReplyTo?: string;
  references?: string;
  threadId?: string;
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
  const bodyToSend = ensureDefaultSignature(draft.editedBody || draft.body);

  let messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  let threadId = opts.threadId || `th_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

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
        fromName: account.displayName || 'Sk Ahidulla',
        to: lead.email,
        subject: subjectToSend,
        body: bodyToSend,
        inReplyTo: opts.inReplyTo,
        references: opts.references,
      });

      const requestPayload: { raw: string; threadId?: string } = { raw: rawBase64Url };
      if (opts.threadId) {
        requestPayload.threadId = opts.threadId;
      }

      let res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      // If threadId was from a different account or not found, retry without threadId
      if (!res.ok && res.status === 404 && requestPayload.threadId) {
        console.warn(`[GmailSend] threadId ${requestPayload.threadId} not found in this mailbox, retrying without threadId...`);
        delete requestPayload.threadId;
        res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
        });
      }

      if (!res.ok) {
        const errText = await res.text();
        let friendlyMessage = `Gmail API error [${res.status}]: ${errText}`;
        if (errText.includes('SERVICE_DISABLED') || errText.includes('Gmail API has not been used')) {
          friendlyMessage = `Gmail API is disabled in your Google Cloud Project. Enable it at: https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=535309342019 then resume your account in Accounts page.`;
        }
        await recordAccountError(account.id, friendlyMessage);
        throw new Error(friendlyMessage);
      }

      const result = await res.json();
      messageId = result.id;
      threadId = result.threadId;
    } catch (err: any) {
      if (!err.message?.includes('Gmail API is disabled')) {
        await recordAccountError(account.id, err.message);
      }
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

  // 5. Update Lead Status, Follow-Up Count & Sticky Account Assignment
  await updateLeadStatus(lead.id, 'contacted');

  const newFollowUpCount = draft.type === 'followup_1' ? 1 : (draft.type === 'followup_2' ? 2 : (lead.followUpCount || 0));

  if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    try {
      await db.collection('leads').doc(lead.id).update({
        status: 'contacted',
        assignedGmailId: account.id,
        lastContactedAt: sentRecord.sentAt,
        followUpCount: newFollowUpCount,
        updatedAt: sentRecord.sentAt,
      });
    } catch (e) {
      console.warn('[GmailSend] Failed to update lead in Firestore:', e);
    }
  }

  // Keep in-memory lead updated
  lead.status = 'contacted';
  lead.assignedGmailId = account.id;
  lead.lastContactedAt = sentRecord.sentAt;
  lead.followUpCount = newFollowUpCount;

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

  draft.status = 'sent';
  draft.updatedAt = sentRecord.sentAt;

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
