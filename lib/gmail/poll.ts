import { Lead, Reply, AppNotification } from '../types';
import { getAccounts } from '../firebase/accounts';
import { getLeads, updateLeadStatus } from '../firebase/leads';
import { getSentEmails, sendOutreachEmail } from './send';
import { classifyInboundReply } from '../agents/classify';
import { draftReplyToProspect } from '../agents/reply';
import { createDraft } from '../firebase/drafts';
import { saveReply, getReplies } from '../firebase/replies';
import { addSuppressedEmail } from '../firebase/suppression';
import { notifyOwnerOfReply } from '../notify/alert';
import { refreshAccessToken } from './oauth';
import { getAdminDb } from '../firebase/admin';

export interface PollResult {
  newRepliesCount: number;
  processedReplies: Reply[];
}

function extractBodyFromPayload(payload: any): string {
  if (!payload) return '';

  if (payload.body && payload.body.data) {
    try {
      return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
    } catch {
      return '';
    }
  }

  if (Array.isArray(payload.parts)) {
    // 1. Prioritize text/plain
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        try {
          return Buffer.from(part.body.data, 'base64url').toString('utf-8');
        } catch {}
      }
    }
    // 2. Nested multipart
    for (const part of payload.parts) {
      if (part.parts) {
        const text = extractBodyFromPayload(part);
        if (text) return text;
      }
    }
    // 3. Fallback to text/html
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        try {
          const html = Buffer.from(part.body.data, 'base64url').toString('utf-8');
          return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        } catch {}
      }
    }
  }

  return '';
}

/**
 * Processes an incoming prospect reply:
 * 1. Matches reply to lead and previous outreach.
 * 2. Runs AI Reply Classifier (interested, question, not_interested, unsubscribe, etc.).
 * 3. Handles status transitions (unsubscribed, lost, replied, interested).
 * 4. Drafts AI response (with calendar booking link or polite close).
 * 5. If safe and qualified, automatically sends reply in thread!
 * 6. Dispatches instant Telegram alert + in-app notification.
 */
export async function processInboundReply(opts: {
  fromEmail: string;
  toAccount: string;
  subject: string;
  body: string;
  messageId?: string;
  gmailMessageId?: string;
  threadId?: string;
  leadId?: string;
}): Promise<Reply> {
  const { fromEmail, toAccount, subject, body } = opts;
  const { leads } = await getLeads();

  // Match lead by email or provided ID
  let lead = leads.find((l) => l.email.toLowerCase().trim() === fromEmail.toLowerCase().trim());
  if (!lead && opts.leadId) {
    lead = leads.find((l) => l.id === opts.leadId);
  }

  if (!lead) {
    throw new Error(`No matching lead found for sender email: ${fromEmail}`);
  }

  // Deduplication guard: Check if this exact message has already been processed
  const existingReplies = await getReplies(lead.id);
  const alreadyProcessed = existingReplies.find(
    (r) =>
      (opts.messageId && r.messageId === opts.messageId) ||
      (opts.gmailMessageId && (r as any).gmailMessageId === opts.gmailMessageId)
  );
  if (alreadyProcessed) {
    console.log(`[ProcessInbound] Reply already processed for message ${opts.messageId || opts.gmailMessageId}, skipping duplicate.`);
    return alreadyProcessed;
  }

  // Find previous outreach sent
  const allSent = await getSentEmails();
  const prevEmail = allSent.find((s) => s.leadId === lead!.id);

  // 1. AI Classification
  const classification = await classifyInboundReply({
    replySubject: subject,
    replyBody: body,
    lead,
    previousOutreach: prevEmail?.body,
  });

  const messageId = opts.messageId || `msg_rep_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const threadId = opts.threadId || prevEmail?.threadId || `th_rep_${Date.now()}`;

  // 2. Draft AI Response
  const draftReply = await draftReplyToProspect({
    lead,
    replySubject: subject,
    replyBody: body,
    classification,
    previousOutreach: prevEmail?.body,
  });

  // 3. Queue reply draft in Approval Queue
  const createdDraft = await createDraft({
    leadId: lead.id,
    type: 'reply',
    subject: draftReply.subject,
    body: draftReply.body,
    aiProvider: 'gemini',
    model: 'gemini-1.5-flash',
    status: 'pending',
    confidence: classification.confidence || 0.95,
    reasoning: `Inbound ${classification.classification.toUpperCase()} response. Action: ${classification.suggestedAction}`,
  });

  // 4. Update Lead Pipeline Status & Automatic Action Triggers
  if (classification.classification === 'unsubscribe') {
    await addSuppressedEmail(lead.email, 'user_requested', lead.id);
    await updateLeadStatus(lead.id, 'unsubscribed');
  } else if (classification.classification === 'not_interested') {
    await updateLeadStatus(lead.id, 'lost');
  } else if (classification.classification === 'interested') {
    await updateLeadStatus(lead.id, 'interested');
  } else {
    await updateLeadStatus(lead.id, 'replied');
  }

  // 5. Automatic reply dispatch:
  // Safety rule: By default, ALL generated AI reply drafts are placed in the Approval Queue (status: 'pending')
  // for human review and approval. Automatic email sending is strictly disabled unless explicitly enabled via ENABLE_AUTO_REPLY=true.
  let autoReplied = false;
  const isAutoReplyAllowed = process.env.ENABLE_AUTO_REPLY === 'true';
  const isInterestedOrQuestion =
    classification.classification === 'interested' || classification.classification === 'question';

  if (isAutoReplyAllowed && isInterestedOrQuestion && !classification.needsHuman) {
    try {
      const accounts = await getAccounts();
      const accountToUse =
        accounts.find((a) => a.gmailAddress.toLowerCase() === toAccount.toLowerCase()) ||
        accounts.find((a) => a.status === 'active') ||
        accounts[0];

      if (
        accountToUse &&
        accountToUse.encryptedRefreshToken &&
        !accountToUse.encryptedRefreshToken.includes('mock_')
      ) {
        console.log(`[AutoReply] Explicitly configured to auto-dispatch response to ${lead.email} via ${accountToUse.gmailAddress}...`);
        await sendOutreachEmail({
          lead,
          draft: createdDraft,
          accountOverride: accountToUse,
          inReplyTo: messageId,
          references: messageId,
          threadId,
        });

        autoReplied = true;
        const db = getAdminDb();
        if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
          await db.collection('drafts').doc(createdDraft.id).update({
            status: 'approved',
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (sendErr: any) {
      console.warn('[AutoReply] Automatic reply dispatch failed, kept in approval queue:', sendErr.message);
    }
  } else {
    console.log(`[ApprovalQueue] Draft reply ${createdDraft.id} queued in pending status for human review.`);
  }

  // 6. Construct and Save Reply Record
  const newReply: Reply = {
    id: `reply-${Date.now()}`,
    leadId: lead.id,
    fromEmail,
    toAccount,
    subject,
    snippet: body.slice(0, 160).replace(/\n/g, ' '),
    body,
    messageId,
    gmailMessageId: opts.gmailMessageId,
    threadId,
    receivedAt: new Date().toISOString(),
    classification: classification.classification,
    sentiment: classification.sentiment,
    summary: classification.summary,
    needsHuman: classification.needsHuman,
    suggestedAction: classification.suggestedAction,
    draftReplyId: createdDraft.id,
    lead,
  };

  await saveReply(newReply);

  // 7. Deduplicate In-App Notification (Navbar badge)
  const globalObj = globalThis as unknown as { __mockNotifications?: AppNotification[] };
  if (!globalObj.__mockNotifications) {
    globalObj.__mockNotifications = [];
  }

  const notificationTitle = classification.classification === 'interested' ? '🔥 Hot Lead Replied!' : '💬 Lead Replied';
  const notificationSnippet = (body || '').slice(0, 50).trim();

  // Guard against duplicate notification within 10 minutes
  const isDuplicateNotification = globalObj.__mockNotifications.some((n) => {
    const isSameLead = n.leadId === lead.id;
    const isSameTitle = n.title === notificationTitle;
    const isRecent = Date.now() - new Date(n.createdAt).getTime() < 10 * 60 * 1000;
    const hasSameText = n.message.includes(notificationSnippet);
    return isSameLead && isSameTitle && isRecent && hasSameText;
  });

  if (!isDuplicateNotification) {
    const notifId = `notif-${Date.now()}`;
    const notif: AppNotification = {
      id: notifId,
      title: notificationTitle,
      message: `${lead.name} (${lead.businessName}): "${(body || '').slice(0, 90)}..."`,
      type: classification.classification === 'interested' ? 'lead_interested' : 'needs_human',
      leadId: lead.id,
      read: false,
      createdAt: new Date().toISOString(),
      link: '/pipeline',
    };
    globalObj.__mockNotifications.unshift(notif);

    const db = getAdminDb();
    if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
      try {
        await db.collection('notifications').doc(notifId).set(notif);
      } catch (e) {
        console.warn('[Notifications] Firestore write error:', e);
      }
    }

    // 8. Trigger Instant Telegram Alert to Owner only for genuine new alerts
    await notifyOwnerOfReply({ lead, reply: newReply, autoReplied });
  } else {
    console.log(`[Notification] Suppressed duplicate notification and Telegram alert for lead ${lead.name}`);
  }

  return newReply;
}

declare global {
  var __inboxPollerInterval: NodeJS.Timeout | undefined;
  var __isPollingActive: boolean | undefined;
  var __inFlightMessageIds: Set<string> | undefined;
}

if (!globalThis.__inFlightMessageIds) {
  globalThis.__inFlightMessageIds = new Set<string>();
}

/**
 * Polls all active connected Gmail accounts for incoming messages
 */
export async function pollActiveInboxes(): Promise<PollResult> {
  // Concurrency guard: Do not run multiple simultaneous polling cycles
  if (globalThis.__isPollingActive) {
    console.log('[PollEngine] Polling already in progress, skipping concurrent trigger.');
    return { newRepliesCount: 0, processedReplies: [] };
  }

  globalThis.__isPollingActive = true;
  try {
    const accounts = await getAccounts();
    const activeAccounts = accounts.filter((a) => a.status === 'active');
    const processedReplies: Reply[] = [];

    const { leads } = await getLeads();
    const allSent = await getSentEmails();
    const existingReplies = await getReplies();

    const processedIds = new Set<string>();
    existingReplies.forEach((r) => {
      if (r.id) processedIds.add(r.id);
      if (r.messageId) {
        processedIds.add(r.messageId);
        processedIds.add(r.messageId.replace(/[<>]/g, '').trim());
      }
      if ((r as any).gmailMessageId) {
        processedIds.add((r as any).gmailMessageId);
      }
    });

    if (globalThis.__inFlightMessageIds) {
      globalThis.__inFlightMessageIds.forEach((id) => processedIds.add(id));
    }

    console.log(`[PollEngine] Polling ${activeAccounts.length} active inboxes...`);

    for (const account of activeAccounts) {
      if (!account.encryptedRefreshToken || account.encryptedRefreshToken.includes('mock_')) {
        continue;
      }

      try {
        const accessToken = await refreshAccessToken(account.encryptedRefreshToken);

        // Search for any messages not sent by ourselves in the last 7 days (lightweight query)
        const listQuery = encodeURIComponent('newer_than:7d -from:me');
        const listRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${listQuery}&maxResults=15`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!listRes.ok) {
          const errText = await listRes.text();
          console.warn(`[PollEngine] Failed to list messages for ${account.gmailAddress}:`, errText);
          continue;
        }

        const listData = await listRes.json();
        const messages: { id: string; threadId: string }[] = listData.messages || [];
        console.log(`[PollEngine] ${account.gmailAddress}: Found ${messages.length} candidate messages.`);

        for (const m of messages) {
          if (processedIds.has(m.id) || globalThis.__inFlightMessageIds?.has(m.id)) {
            continue;
          }

          // Lightweight metadata fetch first to conserve API units
          const msgRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=In-Reply-To&metadataHeaders=References&metadataHeaders=Message-ID&metadataHeaders=Message-Id`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          if (!msgRes.ok) continue;
          const msg = await msgRes.json();

          const headers: { name: string; value: string }[] = msg.payload?.headers || [];
          const getHeader = (name: string) =>
            headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

          const fromHeader = getHeader('From');
          const subject = getHeader('Subject') || 'Re: Outreach';
          const rfcMessageId = getHeader('Message-ID') || getHeader('Message-Id') || m.id;
          const cleanRfcId = rfcMessageId.replace(/[<>]/g, '').trim();
          const inReplyTo = getHeader('In-Reply-To');
          const references = getHeader('References');

          // Extract clean email address from "From" header
          const fromMatch = fromHeader.match(/<([^>]+)>/) || [null, fromHeader.trim()];
          const fromEmail = (fromMatch[1] || fromHeader).toLowerCase().trim();

          // Skip messages sent from the account itself
          if (fromEmail === account.gmailAddress.toLowerCase().trim()) {
            continue;
          }

          if (
            processedIds.has(m.id) ||
            processedIds.has(rfcMessageId) ||
            processedIds.has(cleanRfcId) ||
            globalThis.__inFlightMessageIds?.has(m.id) ||
            globalThis.__inFlightMessageIds?.has(rfcMessageId) ||
            globalThis.__inFlightMessageIds?.has(cleanRfcId)
          ) {
            continue;
          }

          // Match lead:
          // 1. By email address
          let matchedLead = leads.find((l) => l.email.toLowerCase().trim() === fromEmail);

          // 2. Or by conversation thread / In-Reply-To matching a sent outreach email
          if (!matchedLead && (m.threadId || inReplyTo || references)) {
            const sentMatch = allSent.find(
              (s) =>
                (s.threadId && s.threadId === m.threadId) ||
                (s.messageId && inReplyTo && inReplyTo.includes(s.messageId)) ||
                (s.messageId && references && references.includes(s.messageId))
            );
            if (sentMatch) {
              matchedLead = leads.find((l) => l.id === sentMatch.leadId);
            }
          }

          // 3. Or check if lead email is mentioned in fromHeader
          if (!matchedLead) {
            matchedLead = leads.find((l) => fromEmail.includes(l.email.toLowerCase().trim()) || l.email.toLowerCase().trim().includes(fromEmail));
          }

          // If matched to a lead in our pipeline, fetch full body only now!
          if (matchedLead) {
            // Immediate lock so concurrent tasks don't process this message
            globalThis.__inFlightMessageIds?.add(m.id);
            globalThis.__inFlightMessageIds?.add(rfcMessageId);
            globalThis.__inFlightMessageIds?.add(cleanRfcId);

            let body = msg.snippet || 'No message content';
            try {
              const fullRes = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
                {
                  headers: { Authorization: `Bearer ${accessToken}` },
                }
              );
              if (fullRes.ok) {
                const fullMsg = await fullRes.json();
                body = extractBodyFromPayload(fullMsg.payload) || fullMsg.snippet || body;
              }
            } catch {
              // fallback to snippet
            }

            console.log(`[PollEngine] Inbound reply detected from ${matchedLead.name} (${fromEmail})!`);

            const reply = await processInboundReply({
              fromEmail,
              toAccount: account.gmailAddress,
              subject,
              body,
              messageId: rfcMessageId,
              gmailMessageId: m.id,
              threadId: m.threadId,
              leadId: matchedLead.id,
            });

            processedReplies.push(reply);
            processedIds.add(m.id);
            processedIds.add(rfcMessageId);
            processedIds.add(cleanRfcId);
          }
        }
      } catch (err: any) {
        console.warn(`[PollEngine] Error during inbox polling for ${account.gmailAddress}:`, err.message);
      }
    }

    return {
      newRepliesCount: processedReplies.length,
      processedReplies,
    };
  } finally {
    globalThis.__isPollingActive = false;
  }
}

export function startInboxPollerDaemon() {
  if (globalThis.__inboxPollerInterval) return;
  console.log('[PollEngine] Background poller daemon started (every 20s).');
  globalThis.__inboxPollerInterval = setInterval(async () => {
    try {
      await pollActiveInboxes();
    } catch (e: any) {
      console.warn('[PollEngine] Daemon poll cycle error:', e.message);
    }
  }, 20000);
}
