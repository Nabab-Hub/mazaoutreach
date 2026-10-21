import { sendTelegramAlert, TelegramAlertOpts } from './telegram';
import { sendOwnerEmailAlert } from './email';
import { Lead, Reply } from '../types';

export async function notifyOwnerOfReply(opts: {
  lead: Lead;
  reply: Reply;
}): Promise<void> {
  const { lead, reply } = opts;

  // Only trigger instant alerts for 'interested' or 'needsHuman' leads
  if (reply.classification !== 'interested' && !reply.needsHuman) {
    return;
  }

  const alertOpts: TelegramAlertOpts = {
    leadName: lead.name,
    businessName: lead.businessName,
    niche: lead.niche,
    classification: reply.classification,
    summary: reply.summary,
    replySnippet: reply.snippet || reply.body,
    needsHuman: reply.needsHuman,
  };

  // Dispatches both Telegram message and email to the platform owner in parallel
  await Promise.allSettled([
    sendTelegramAlert(alertOpts),
    sendOwnerEmailAlert({ lead, reply }),
  ]);
}
