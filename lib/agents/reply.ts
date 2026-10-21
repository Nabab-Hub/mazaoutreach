import { aiRouter } from '../ai/router';
import { ClassificationResult, Lead } from '../types';

export const SYSTEM_REPLY_DRAFTER_PROMPT = `Draft a polite, concise reply to a prospect. 
Answer only what you know from the service list (web apps, mobile apps, SaaS, APIs, chatbots, custom ML automations). 
Never quote prices or deadlines; suggest a short introductory call using this calendar link: {calendarLink}. 
If the lead is not interested, thank them in one polite line and close.
If the lead asks to unsubscribe, acknowledge courteously.

Return strictly valid JSON:
{
  "subject": "Re: ...",
  "body": "..."
}`;

export async function draftReplyToProspect(opts: {
  lead: Lead;
  replySubject: string;
  replyBody: string;
  classification: ClassificationResult;
  calendarLink?: string;
  previousOutreach?: string;
}): Promise<{ subject: string; body: string }> {
  const { lead, replySubject, replyBody, classification, previousOutreach } = opts;
  const calendarLink =
    opts.calendarLink ||
    process.env.NEXT_PUBLIC_BOOKING_URL ||
    process.env.CALENDAR_BOOKING_LINK ||
    'https://cal.com/alexvance/10min';

  // Fast-path for not interested
  if (classification.classification === 'not_interested') {
    const firstName = lead.name ? lead.name.split(' ')[0] : 'there';
    return {
      subject: replySubject.startsWith('Re:') ? replySubject : `Re: ${replySubject}`,
      body: `Hi ${firstName},\n\nThank you for letting me know! Wishing you and ${lead.businessName} continued success.\n\nBest regards,\nAlex Vance\n\nReply STOP to unsubscribe.`,
    };
  }

  // Fast-path for unsubscribe
  if (classification.classification === 'unsubscribe') {
    return {
      subject: replySubject.startsWith('Re:') ? replySubject : `Re: ${replySubject}`,
      body: `You have been removed from our outreach list. We apologize for any inconvenience.\n\nBest regards,\nAlex Vance`,
    };
  }

  // AI draft for interested / questions
  const prompt = `### Prospect Info:
- Name: ${lead.name}
- Business: ${lead.businessName}
- Niche: ${lead.niche}

### Prospect Reply:
"""
${replyBody}
"""

### Classification:
- Category: ${classification.classification}
- Summary: ${classification.summary}
- Needs Human Signoff: ${classification.needsHuman}

### Booking Link:
${calendarLink}

### Previous Outreach Sent:
"""
${previousOutreach || 'Initial outreach introducing software engineering & automation services.'}
"""

Draft the reply adhering to the rules.`;

  const system = SYSTEM_REPLY_DRAFTER_PROMPT.replace('{calendarLink}', calendarLink);

  try {
    const res = await aiRouter.generateForTask('reply', {
      system,
      prompt,
      json: true,
    });

    const cleaned = res.text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    let body = parsed.body || '';
    if (!body.toLowerCase().includes('stop to unsubscribe')) {
      body += '\n\nReply STOP to unsubscribe.';
    }

    const subject = parsed.subject || (replySubject.startsWith('Re:') ? replySubject : `Re: ${replySubject}`);

    return { subject, body };
  } catch (err) {
    console.warn('[ReplyDrafter] AI drafting failed, using fallback template:', err);
    const firstName = lead.name ? lead.name.split(' ')[0] : 'there';
    return {
      subject: replySubject.startsWith('Re:') ? replySubject : `Re: ${replySubject}`,
      body: `Hi ${firstName},\n\nThanks for getting back to me! I'd love to learn more about ${lead.businessName} and explore how we can tailor this for your team.\n\nWould you be open to picking a quick 10-15 minute slot here?\n${calendarLink}\n\nLooking forward to speaking!\n\nBest regards,\nAlex Vance\n\nReply STOP to unsubscribe.`,
    };
  }
}
