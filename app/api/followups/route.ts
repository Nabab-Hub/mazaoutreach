import { NextRequest, NextResponse } from 'next/server';
import { getDueFollowUps, generateFollowUpDraft, runFollowUpCycle } from '@/lib/automation/followup';
import { getLeads } from '@/lib/firebase/leads';

export async function GET() {
  try {
    const candidates = await getDueFollowUps();
    return NextResponse.json({
      success: true,
      totalDue: candidates.length,
      candidates,
    });
  } catch (error: any) {
    console.error('Followups GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch follow-up candidates' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, leadId, followUpNumber } = body;

    // 1. Run cycle for all due leads
    if (action === 'run_cycle') {
      const result = await runFollowUpCycle();
      return NextResponse.json({
        success: true,
        message: `Generated ${result.draftsCreated.length} follow-up drafts for approval.`,
        result,
      });
    }

    // 2. Trigger for a specific lead
    if (action === 'generate_for_lead') {
      if (!leadId) {
        return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });
      }

      const { leads } = await getLeads();
      const lead = leads.find((l) => l.id === leadId);
      if (!lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }

      const num = (followUpNumber === 2 ? 2 : 1) as 1 | 2;
      const draft = await generateFollowUpDraft(lead, num);

      return NextResponse.json({
        success: true,
        message: `Follow-up draft #${num} created for ${lead.name} (${lead.businessName}).`,
        draft,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Followups POST Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process follow-ups' },
      { status: 500 }
    );
  }
}
