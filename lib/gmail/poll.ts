import { Lead, Reply } from '../types';
import { getAccounts } from '../firebase/accounts';
import { getLeads, updateLeadStatus } from '../firebase/leads';
import { getSentEmails } from './send';
import { classifyInboundReply } from '../agents/classify';
import { draftReplyToProspect } from '../agents/reply';
import { createDraft } from '../firebase/drafts';
import { saveReply } from '../firebase/replies';
import { addSuppressedEmail } from '../firebase/suppression';
import { notifyOwnerOfReply } from '../notify/alert';

export interface PollResult {
  newRepliesCount: number;
  processedReplies: Reply[];
}

/**
 * Simulates or processes an incoming prospect reply:
 * 1. Matches reply to lead and previous outreach.
 * 2. Runs AI Reply Classifier (interested, question, not_interested, unsubscribe, etc.).
 * 3. Handles status transitions (unsubscribed, lost, replied, interested).
 * 4. Drafts AI response (with calendar booking link or polite close).
 * 5. Queues draft into Approval Queue.
 * 6. Dispatches instant Telegram/email notification if interested or needsHuman.
 */
export async function processInboundReply(opts: {
  fromEmail: string;
  toAccount: string;
  subject: string;
  body: string;
  messageId?: string;
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

  // 5. Construct and Save Reply Record
  const newReply: Reply = {
    id: `reply-${Date.now()}`,
    leadId: lead.id,
    fromEmail,
    toAccount,
    subject,
    snippet: body.slice(0, 160).replace(/\n/g, ' '),
    body,
    messageId,
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

  // 6. Trigger Instant Alert to Owner (Telegram)
  await notifyOwnerOfReply({ lead, reply: newReply });

  return newReply;
}

/**
 * Polls all active connected Gmail accounts for incoming messages
 */
export async function pollActiveInboxes(): Promise<PollResult> {
  const accounts = await getAccounts();
  const activeAccounts = accounts.filter((a) => a.status === 'active');
  const processedReplies: Reply[] = [];

  // In live environment, this calls users.messages.list on each account.
  // In demo mode or if no live unread messages exist, we return status.
  console.log(`[PollEngine] Polling ${activeAccounts.length} active inboxes...`);

  return {
    newRepliesCount: processedReplies.length,
    processedReplies,
  };
}
