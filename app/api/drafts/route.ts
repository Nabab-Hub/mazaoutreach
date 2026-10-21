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

    // 1. Batch generate drafts for leads
    if (action === 'generate') {
      const { leadIds, niche, customInstruction, forceAll } = body;
      const { leads } = await getLeads();
      const existingDrafts = await getDrafts();
      const draftedLeadIds = new Set(existingDrafts.map((d) => d.leadId));

      let targetLeads = leads;
      if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) {
        targetLeads = leads.filter((l) => leadIds.includes(l.id));
      } else if (forceAll) {
        targetLeads = leads.filter((l) => l.status !== 'unsubscribed');
      } else {
        // Priority: Leads with status 'new' OR leads that don't have an active draft yet
        const unDrafted = leads.filter(
          (l) => (l.status === 'new' || !draftedLeadIds.has(l.id)) && l.status !== 'unsubscribed'
        );
        targetLeads = unDrafted.length > 0 ? unDrafted : leads.filter((l) => l.status !== 'unsubscribed');
      }

      if (niche && niche !== 'all') {
        targetLeads = targetLeads.filter((l) => l.niche === niche);
      }

      if (targetLeads.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No eligible leads found for draft generation.',
          generated: 0,
          drafts: [],
        });
      }

      const generatedDrafts = [];
      const errors = [];

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

      return NextResponse.json({
        success: true,
        generated: generatedDrafts.length,
        drafts: generatedDrafts,
        errors,
      });
    }

    // 2. Approve draft (with optional edits)
    if (action === 'approve') {
      const { draftId, editedSubject, editedBody } = body;
      if (!draftId) {
        return NextResponse.json({ error: 'draftId is required' }, { status: 400 });
      }

      const updated = await approveDraft(draftId, { editedSubject, editedBody });
      return NextResponse.json({ success: true, draft: updated });
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

    // 5. Bulk approve
    if (action === 'bulk_approve') {
      const { draftIds } = body;
      if (!draftIds || !Array.isArray(draftIds) || draftIds.length === 0) {
        return NextResponse.json({ error: 'draftIds array is required' }, { status: 400 });
      }

      const count = await bulkApproveDrafts(draftIds);
      return NextResponse.json({ success: true, approvedCount: count });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('[API /api/drafts POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Operation failed' }, { status: 500 });
  }
}
