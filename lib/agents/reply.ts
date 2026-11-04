import { aiRouter } from '../ai/router';
import { ClassificationResult, Lead } from '../types';
import { ensureDefaultSignature, DEFAULT_EMAIL_SIGNATURE } from '../templates/signature';
import { callAgenticReply } from '../agentic-ai/client';

export const SYSTEM_REPLY_DRAFTER_PROMPT = `You write thoughtful, high-converting, professional email replies for senior full-stack engineer and automation specialist Sk Ahidulla.

Guidelines:
1. When the prospect is interested or asks for a meeting:
   - Acknowledge their positive response with enthusiasm and reference any specific dates, days (e.g. Wednesday), or technical requirements they mentioned.
   - Propose 2 flexible meeting times AND provide the booking link ({calendarLink}) to lock in a 15-minute introductory call.
   - Mention what you will cover: scoping their technical requirements, recommended modern architecture (Next.js/Flutter/Python/AI), and project timeline.
   - Structure: 3-4 professional, well-structured paragraphs (approx 80–120 words). Do not write a lazy 1-line reply.
2. When the prospect has questions:
   - Answer their specific technical questions directly and offer a brief discovery call via {calendarLink}.
3. If not interested:
   - Thank them in one polite sentence and wish them continued success.
4. If asking to unsubscribe:
   - Courteously confirm their removal.

Do NOT include signature blocks or signoffs in "body" (the system attaches the verified signature automatically).
Do NOT include 'Subject:' in the body.

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
    'https://cal.com/skahidulla/10min';

  const rawName = (lead.name || '').trim();
  const isGeneric = !rawName || ['business', 'lead', 'client', 'prospect', 'unknown'].includes(rawName.toLowerCase());
  const greetingName = isGeneric ? (lead.businessName || 'there') : rawName.split(' ')[0];

  // Fast-path for not interested
  if (classification.classification === 'not_interested') {
    const greeting = isGeneric ? 'Hi there' : `Hi ${greetingName}`;
    return {
      subject: replySubject.startsWith('Re:') ? replySubject : `Re: ${replySubject}`,
      body: ensureDefaultSignature(`${greeting},\n\nThank you for letting me know! Wishing you and ${lead.businessName} continued success.`),
    };
  }

  // Fast-path for unsubscribe
  if (classification.classification === 'unsubscribe') {
    return {
      subject: replySubject.startsWith('Re:') ? replySubject : `Re: ${replySubject}`,
      body: `You have been removed from our outreach list. We apologize for any inconvenience.\n\n${DEFAULT_EMAIL_SIGNATURE}`,
    };
  }

  // Try Agentic AI Reply Agent
  try {
    const agenticRes = await callAgenticReply({
      fromEmail: lead.email,
      subject: replySubject,
      body: replyBody,
      previousOutreach,
      leadId: lead.id,
      leadName: isGeneric ? (lead.businessName || 'there') : rawName,
      businessName: lead.businessName,
    });
    if (agenticRes?.action_plan?.reply_body) {
      console.log(`[ReplyAgent] Used Agentic AI response plan (${agenticRes.action_plan.action_type}) for ${lead.email}`);
      return {
        subject: agenticRes.action_plan.reply_subject || `Re: ${replySubject}`,
        body: ensureDefaultSignature(agenticRes.action_plan.reply_body),
      };
    }
  } catch (err) {
    console.info('[ReplyAgent] Agentic AI offline, using local reply drafter:', err);
  }

  // AI draft for interested / questions
  const prompt = `### Prospect Info:
- Contact Name: ${greetingName}
- Business: ${lead.businessName}
- Niche: ${lead.niche}
(Note: Never address the prospect by their email username or generic words like 'Business'. Greet as 'Hi ${greetingName},' or 'Hi there,')

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

    const body = ensureDefaultSignature(parsed.body || '');
    const subject = parsed.subject || (replySubject.startsWith('Re:') ? replySubject : `Re: ${replySubject}`);

    return { subject, body };
  } catch (err) {
    console.warn('[ReplyDrafter] AI drafting failed, using fallback template:', err);
    const greeting = isGeneric ? 'Hi there' : `Hi ${greetingName}`;
    return {
      subject: replySubject.startsWith('Re:') ? replySubject : `Re: ${replySubject}`,
      body: ensureDefaultSignature(`${greeting},\n\nThanks for getting back to me! I'd love to learn more about ${lead.businessName} and explore how we can tailor this for your team.\n\nWould you be open to picking a quick 10-15 minute slot here?\n${calendarLink}\n\nLooking forward to speaking!`),
    };
  }
}
