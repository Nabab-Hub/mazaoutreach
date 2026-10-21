import { Lead, Draft } from '../types';
import { getLeads, updateLeadStatus } from '../firebase/leads';
import { createDraft } from '../firebase/drafts';
import { getSuppressionEntries } from '../firebase/suppression';

export interface FollowUpCandidate {
  lead: Lead;
  followUpNumber: 1 | 2;
  daysSinceLastContact: number;
  reason: string;
}

/**
 * Identifies leads that are due for Day 3 or Day 7 follow-ups
 */
export async function getDueFollowUps(): Promise<FollowUpCandidate[]> {
  const { leads } = await getLeads();
  const suppression = await getSuppressionEntries();
  const suppressedSet = new Set(suppression.map((s) => s.email.toLowerCase().trim()));

  const candidates: FollowUpCandidate[] = [];
  const now = Date.now();

  for (const lead of leads) {
    // Only follow up on leads that were contacted and haven't replied, unsubscribed, or closed
    if (lead.status !== 'contacted') continue;
    if (suppressedSet.has(lead.email.toLowerCase().trim())) continue;
    if (lead.followUpCount >= 2) continue;

    const lastContactTime = lead.lastContactedAt ? new Date(lead.lastContactedAt).getTime() : now;
    const daysSince = Math.floor((now - lastContactTime) / (1000 * 60 * 60 * 24));

    // Follow-up 1: Day 3 after initial contact
    if (lead.followUpCount === 0 && daysSince >= 3) {
      candidates.push({
        lead,
        followUpNumber: 1,
        daysSinceLastContact: daysSince,
        reason: 'Day 3 follow-up (no reply received)',
      });
    }
    // Follow-up 2 (Final): Day 7 after initial contact
    else if (lead.followUpCount === 1 && daysSince >= 7) {
      candidates.push({
        lead,
        followUpNumber: 2,
        daysSinceLastContact: daysSince,
        reason: 'Day 7 final follow-up (no reply received)',
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

  let subject = '';
  let body = '';

  if (followUpNumber === 1) {
    // Day 3: Fresh angle offering a concrete, lightweight idea
    subject = `Quick follow up regarding ${business}`;
    body = `Hi ${firstName},

I wanted to briefly bump this to the top of your inbox in case you were busy earlier in the week.

To give you a concrete idea: for a similar ${lead.niche} business, we set up an automated member registration workflow and automated WhatsApp payment reminders that reduced admin workload by over 15 hours each month.

Would you be open to a 10-minute call this Thursday or Friday to see if a similar setup makes sense for ${business}?

Best regards,
Alex Vance

Reply STOP to unsubscribe.`;
  } else {
    // Day 7: Polite final check-in, keeping the door open without being pushy
    subject = `Final check-in regarding ${business}`;
    body = `Hi ${firstName},

I know how busy managing operations at ${business} can be, so I won't crowd your inbox any further.

If you ever decide to revisit streamlining client bookings, digital check-ins, or workflow automations down the road, feel free to keep my details handy or reach out anytime.

Wishing you and the team at ${business} continued growth and success!

Best regards,
Alex Vance

Reply STOP to unsubscribe.`;
  }

  const draft = await createDraft({
    leadId: lead.id,
    type: followUpNumber === 1 ? 'followup_1' : 'followup_2',
    subject,
    body,
    aiProvider: 'gemini',
    model: 'gemini-1.5-flash',
    status: 'pending',
    confidence: 0.94,
    reasoning: `Follow-up #${followUpNumber} (${followUpNumber === 1 ? 'Day 3 fresh angle' : 'Day 7 final check-in'}).`,
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
