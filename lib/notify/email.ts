import { Lead, Reply } from '../types';
import { sendGmailMessage } from '../gmail/send';

export interface OwnerEmailAlertOpts {
  lead: Lead;
  reply: Reply;
  ownerEmail?: string;
}

/**
 * Sends an email notification to the platform owner when a hot prospect replies or needs human intervention
 */
export async function sendOwnerEmailAlert(opts: OwnerEmailAlertOpts): Promise<boolean> {
  const ownerEmail = opts.ownerEmail || process.env.OWNER_EMAIL;

  if (!ownerEmail || ownerEmail.includes('your_')) {
    console.log(`[OwnerEmailAlert (Simulation)] Owner alert email prepared for ${opts.lead.name} (${opts.lead.businessName}) -> ${opts.reply.classification.toUpperCase()}`);
    return true;
  }

  const subject = opts.reply.classification === 'interested'
    ? `🔥 Hot Lead Alert: ${opts.lead.name} (${opts.lead.businessName}) is interested!`
    : `⚠️ Human Action Required: Reply from ${opts.lead.name} (${opts.lead.businessName})`;

  const body = `Hi Alex,

An inbound reply requires your attention:

Lead: ${opts.lead.name} (${opts.lead.businessName})
Niche: ${opts.lead.niche}
Category: ${opts.reply.classification.toUpperCase()}
Sentiment: ${opts.reply.sentiment}
Requires Human Attention: ${opts.reply.needsHuman ? 'YES' : 'NO'}

Summary:
"${opts.reply.summary}"

Prospect Reply:
----------------------------------------
${opts.reply.body}
----------------------------------------

Suggested Action: ${opts.reply.suggestedAction || 'Review and approve draft reply'}

View lead and full conversation thread in your dashboard:
${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pipeline

--
Agentic Client Outreach Engine`;

  try {
    const sent = await sendGmailMessage({
      to: ownerEmail,
      subject,
      body,
      leadId: opts.lead.id,
      skipDelay: true,
    });

    console.log(`[OwnerEmailAlert] Alert dispatched to owner (${ownerEmail}), status: ${sent.status}`);
    return sent.status === 'sent';
  } catch (err: any) {
    console.warn(`[OwnerEmailAlert] Could not send email alert to owner:`, err.message);
    return false;
  }
}
