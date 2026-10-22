import { Lead, Draft } from '../types';
import { getLeads, updateLeadStatus } from '../firebase/leads';
import { createDraft, getDrafts } from '../firebase/drafts';
import { getSuppressionEntries } from '../firebase/suppression';
import { aiRouter } from '../ai/router';
import { ensureDefaultSignature, DEFAULT_EMAIL_SIGNATURE, COMPLIANCE_OPT_OUT } from '../templates/signature';

export interface FollowUpCandidate {
  lead: Lead;
  followUpNumber: 1 | 2;
  daysSinceLastContact: number;
  reason: string;
}

/**
 * Identifies leads that are due for Day 2-3 or subsequent follow-ups
 */
export async function getDueFollowUps(): Promise<FollowUpCandidate[]> {
  const { leads } = await getLeads();
  const suppression = await getSuppressionEntries();
  const suppressedSet = new Set(suppression.map((s) => s.email.toLowerCase().trim()));
  const allDrafts = await getDrafts();

  // Active drafts already in pending or approved status (prevents duplicate generation)
  const activeDraftLeadIds = new Set(
    allDrafts
      .filter((d) => d.status === 'pending' || d.status === 'approved')
      .map((d) => d.leadId)
  );

  const candidates: FollowUpCandidate[] = [];
  const now = Date.now();

  for (const lead of leads) {
    // Only follow up on leads that were contacted and haven't replied, unsubscribed, or converted
    if (lead.status !== 'contacted') continue;
    if (suppressedSet.has(lead.email.toLowerCase().trim())) continue;
    if ((lead.followUpCount || 0) >= 2) continue;
    if (activeDraftLeadIds.has(lead.id)) continue;

    const lastContactTime = lead.lastContactedAt ? new Date(lead.lastContactedAt).getTime() : now;
    const hoursSince = Math.max(0, (now - lastContactTime) / (1000 * 60 * 60));
    const daysSince = Math.floor(hoursSince / 24);

    // Follow-up 1: 2 to 3 days (>= 48 hours) after initial contact
    if ((lead.followUpCount || 0) === 0 && (daysSince >= 2 || hoursSince >= 48)) {
      candidates.push({
        lead,
        followUpNumber: 1,
        daysSinceLastContact: daysSince,
        reason: `${daysSince} days since initial email with no reply`,
      });
    }
    // Follow-up 2 (Final): 2 to 3 days (>= 48 hours) after Follow-up 1
    else if (lead.followUpCount === 1 && (daysSince >= 2 || hoursSince >= 48)) {
      candidates.push({
        lead,
        followUpNumber: 2,
        daysSinceLastContact: daysSince,
        reason: `${daysSince} days since follow-up #1 with no reply`,
      });
    }
  }

  return candidates;
}

/**
 * Generates a tailored follow-up draft with a fresh angle
 */
export async function generateFollowUpDraft(
  lead: Lead,
  followUpNumber: 1 | 2
): Promise<Draft> {
  const firstName = lead.name ? lead.name.split(' ')[0] : 'there';
  const business = lead.businessName || 'your business';
  const niche = lead.niche || 'other';

  let subject = '';
  let body = '';
  let aiProvider: any = 'grok';
  let aiModel = 'qwen/qwen3.8-27b';

  try {
    const prompt = `Write a short, professional, non-pushy follow-up email #${followUpNumber} to a prospective client who did not reply to our initial cold outreach.

Recipient Details:
- Name: ${lead.name || firstName}
- Business: ${business}
- Niche: ${niche}
- City: ${lead.city || 'India'}
${lead.companyDescription ? `- Company Details/Description: ${lead.companyDescription}` : ''}
${lead.notes ? `- Notes: ${lead.notes}` : ''}

Goal for Follow-up #${followUpNumber}:
${
  followUpNumber === 1
    ? '- Follow-up #1 (Sent 2-3 days later): Briefly bump the previous message to the top of inbox. Offer one specific, high-value angle or idea tailored to their business. Under 90 words. Friendly call to action for a brief 10-minute chat.'
    : '- Follow-up #2 (Final follow-up sent 2-3 days later): Polite final check-in. Acknowledge they are busy, keep the door open for future collaboration, wish them success, and state we will not clutter their inbox further. Under 80 words.'
}

Output format: JSON with "subject" and "body" keys only. Ensure body includes "Reply STOP to unsubscribe." at the end.`;

    const res = await aiRouter.generateForTask('personalize', {
      prompt,
      json: true,
      system: 'You are an elite, respectful B2B outreach copywriter. Return strictly valid JSON.',
    });

    const parsed = JSON.parse(res.text);
    if (parsed.subject && parsed.body) {
      subject = parsed.subject.trim();
      body = parsed.body.trim();
      aiProvider = res.provider;
      aiModel = res.model;
    }
  } catch (err) {
    console.warn(`[FollowUp] AI generation failed, falling back to copy template:`, err);
  }

  // Fallback copy if AI generation failed
  if (!subject || !body) {
    if (followUpNumber === 1) {
      subject = `Quick follow up regarding ${business}`;
      body = `Hi ${firstName},

I wanted to briefly bump this to the top of your inbox in case you were busy earlier in the week.

To give you a concrete idea: for a similar ${niche} business, we set up an automated booking workflow and WhatsApp customer reminders that reduced admin workload by over 15 hours each month.

Would you be open to a brief 10-minute call this Thursday or Friday to see if a similar setup makes sense for ${business}?

${DEFAULT_EMAIL_SIGNATURE}

${COMPLIANCE_OPT_OUT}`;
    } else {
      subject = `Final check-in regarding ${business}`;
      body = `Hi ${firstName},

I know how busy managing operations at ${business} can be, so I won't crowd your inbox any further.

If you ever decide to revisit streamlining client bookings, digital check-ins, or workflow automations down the road, feel free to keep my details handy or reach out anytime.

Wishing you and the team at ${business} continued growth and success!

${DEFAULT_EMAIL_SIGNATURE}

${COMPLIANCE_OPT_OUT}`;
    }
  }

  const finalBody = ensureDefaultSignature(body);

  const draft = await createDraft({
    leadId: lead.id,
    type: followUpNumber === 1 ? 'followup_1' : 'followup_2',
    subject,
    body: finalBody,
    aiProvider,
    model: aiModel,
    status: 'pending',
    confidence: 0.95,
    reasoning: `Follow-up #${followUpNumber} (${followUpNumber === 1 ? '2-3 days bump with fresh angle' : 'Final check-in'}).`,
  });

  return draft;
}

/**
 * Runs the follow-up evaluation cycle across all eligible leads
 */
export async function runFollowUpCycle(): Promise<{
  candidatesCount: number;
  draftsCreated: Draft[];
}> {
  const candidates = await getDueFollowUps();
  const draftsCreated: Draft[] = [];

  for (const item of candidates) {
    const draft = await generateFollowUpDraft(item.lead, item.followUpNumber);
    draftsCreated.push(draft);
  }

  return {
    candidatesCount: candidates.length,
    draftsCreated,
  };
}
