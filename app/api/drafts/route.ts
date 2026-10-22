import { NextRequest, NextResponse } from 'next/server';
import {
  getDrafts,
  getDraftById,
  createDraft,
  approveDraft,
  rejectDraft,
  regenerateDraft,
  bulkApproveDrafts,
  getLearningExamples,
} from '@/lib/firebase/drafts';
import { getLeads } from '@/lib/firebase/leads';
import { generatePersonalizedDraft } from '@/lib/agents/personalize';
import { sendOutreachEmail } from '@/lib/gmail/send';
import { getDueFollowUps, generateFollowUpDraft } from '@/lib/automation/followup';
import { Lead } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const niche = searchParams.get('niche') || undefined;
    const search = searchParams.get('search') || undefined;

    const drafts = await getDrafts({ status, niche, search });

    return NextResponse.json({
      success: true,
      drafts,
      total: drafts.length,
      pendingCount: drafts.filter((d) => d.status === 'pending').length,
    });
  } catch (err: any) {
    console.error('[API /api/drafts GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch drafts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. Batch generate drafts for new leads & check due follow-ups (2-3+ days no reply)
    if (action === 'generate') {
      const { leadIds, niche, customInstruction, forceAll, checkFollowUps = true } = body;
      const { leads } = await getLeads();
      const existingDrafts = await getDrafts();

      // Lead IDs that already have an initial or active draft
      const draftedLeadIds = new Set(existingDrafts.map((d) => d.leadId));

      let targetLeads: Lead[] = [];
      if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) {
        targetLeads = leads.filter((l) => leadIds.includes(l.id));
      } else if (forceAll) {
        // Only uncontacted and non-unsubscribed leads
        targetLeads = leads.filter(
          (l) => l.status !== 'unsubscribed' && l.status !== 'replied' && l.status !== 'won'
        );
      } else {
        // STRICT: Only NEW leads who have never been contacted and do NOT have an existing draft
        targetLeads = leads.filter(
          (l) => l.status === 'new' && !draftedLeadIds.has(l.id)
        );
      }

      if (niche && niche !== 'all') {
        targetLeads = targetLeads.filter((l) => l.niche === niche);
      }

      const generatedDrafts = [];
      const errors = [];

      // Generate initial drafts for eligible new leads
      for (const lead of targetLeads) {
        try {
          const fewShotExamples = await getLearningExamples(lead.niche);
          const result = await generatePersonalizedDraft({
            lead,
            fewShotExamples,
            customInstruction,
          });

          const draft = await createDraft({
            leadId: lead.id,
            type: 'initial',
            subject: result.subject,
            body: result.body,
            aiProvider: result.provider,
            model: result.model,
            status: 'pending',
            confidence: result.confidence,
            reasoning: result.reasoning,
            feedback: customInstruction,
          });

          generatedDrafts.push(draft);
        } catch (err: any) {
          console.error(`[Drafts API] Generation failed for lead ${lead.id}:`, err);
          errors.push({ leadId: lead.id, email: lead.email, error: err.message });
        }
      }

      // Check and generate DUE follow-ups for contacted leads (2-3+ days without reply)
      let followUpsCreated = 0;
      if (checkFollowUps) {
        try {
          const dueFollowUps = await getDueFollowUps();
          for (const item of dueFollowUps) {
            const fuDraft = await generateFollowUpDraft(item.lead, item.followUpNumber);
            generatedDrafts.push(fuDraft);
            followUpsCreated++;
          }
        } catch (fuErr: any) {
          console.warn('[Drafts API] Follow-up check notice:', fuErr);
        }
      }

      let message = 'No eligible leads found for draft generation (all leads already drafted or not due for follow-up).';
      if (generatedDrafts.length > 0) {
        message = `Generated ${targetLeads.length} initial drafts and ${followUpsCreated} due follow-up drafts for approval.`;
      }

      return NextResponse.json({
        success: true,
        message,
        generated: generatedDrafts.length,
        initialGenerated: targetLeads.length,
        followUpsGenerated: followUpsCreated,
        drafts: generatedDrafts,
        errors,
      });
    }

    // 2. Approve draft (with optional edits) & SEND IMMEDIATELY
    if (action === 'approve') {
      const { draftId, editedSubject, editedBody, sendNow = true } = body;
      if (!draftId) {
        return NextResponse.json({ error: 'draftId is required' }, { status: 400 });
      }

      const updated = await approveDraft(draftId, { editedSubject, editedBody });

      if (sendNow) {
        try {
          const { leads } = await getLeads();
          const lead = leads.find((l) => l.id === updated.leadId);
          if (!lead) {
            throw new Error(`Lead with ID ${updated.leadId} not found in database.`);
          }

          const sendResult = await sendOutreachEmail({
            lead,
            draft: updated,
          });

          return NextResponse.json({
            success: true,
            draft: { ...updated, status: 'sent' },
            sent: true,
            sendResult,
          });
        } catch (sendErr: any) {
          console.error(`[Drafts API] Draft ${draftId} approved, but send failed:`, sendErr);
          return NextResponse.json({
            success: true,
            draft: updated,
            sent: false,
            warning: sendErr.message || 'Draft approved, but sending failed.',
          });
        }
      }

      return NextResponse.json({ success: true, draft: updated, sent: false });
    }

    // 3. Reject draft
    if (action === 'reject') {
      const { draftId, reason } = body;
      if (!draftId) {
        return NextResponse.json({ error: 'draftId is required' }, { status: 400 });
      }

      const updated = await rejectDraft(draftId, reason);
      return NextResponse.json({ success: true, draft: updated });
    }

    // 4. Regenerate draft with custom instruction
    if (action === 'regenerate') {
      const { draftId, instruction } = body;
      if (!draftId) {
        return NextResponse.json({ error: 'draftId is required' }, { status: 400 });
      }

      const updated = await regenerateDraft(draftId, instruction || 'Refine and make more engaging');
      return NextResponse.json({ success: true, draft: updated });
    }

    // 5. Bulk approve & SEND IMMEDIATELY
    if (action === 'bulk_approve') {
      const { draftIds, sendNow = true } = body;
      if (!draftIds || !Array.isArray(draftIds) || draftIds.length === 0) {
        return NextResponse.json({ error: 'draftIds array is required' }, { status: 400 });
      }

      const count = await bulkApproveDrafts(draftIds);
      let sentCount = 0;
      const sendErrors: any[] = [];

      if (sendNow) {
        const allDrafts = await getDrafts();
        const { leads } = await getLeads();
        const leadsMap = new Map(leads.map((l) => [l.id, l]));

        for (const id of draftIds) {
          const draft = allDrafts.find((d) => d.id === id);
          if (!draft) continue;
          const lead = leadsMap.get(draft.leadId);
          if (!lead) continue;

          try {
            await sendOutreachEmail({ lead, draft });
            sentCount++;
          } catch (err: any) {
            sendErrors.push({ draftId: id, email: lead.email, error: err.message });
          }
        }
      }

      return NextResponse.json({
        success: true,
        approvedCount: count,
        sentCount,
        errors: sendErrors,
        warning:
          sendErrors.length > 0
            ? `${sentCount} sent, ${sendErrors.length} failed to send: ${sendErrors[0]?.error}`
            : undefined,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('[API /api/drafts POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Operation failed' }, { status: 500 });
  }
}
