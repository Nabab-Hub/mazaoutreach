import { NextRequest, NextResponse } from 'next/server';
import { getDraftById, getDrafts } from '@/lib/firebase/drafts';
import { getLeads } from '@/lib/firebase/leads';
import { sendOutreachEmail, getSentEmails } from '@/lib/gmail/send';
import { getAccountById, getAccounts } from '@/lib/firebase/accounts';
import { Lead } from '@/lib/types';

export async function GET() {
  try {
    const sentEmails = await getSentEmails();
    return NextResponse.json({ success: true, sentEmails, total: sentEmails.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch sent emails' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. Send single approved draft
    if (action === 'send_draft') {
      const { draftId, accountId } = body;
      if (!draftId) {
        return NextResponse.json({ error: 'draftId is required' }, { status: 400 });
      }

      const draft = await getDraftById(draftId);
      if (!draft) {
        return NextResponse.json({ error: `Draft ${draftId} not found` }, { status: 404 });
      }

      const { leads } = await getLeads();
      const lead = leads.find((l) => l.id === draft.leadId);
      if (!lead) {
        return NextResponse.json({ error: `Lead ${draft.leadId} not found` }, { status: 404 });
      }

      let accountOverride;
      if (accountId) {
        accountOverride = await getAccountById(accountId);
      }

      const result = await sendOutreachEmail({
        lead,
        draft,
        accountOverride: accountOverride || undefined,
      });

      return NextResponse.json({ success: true, result });
    }

    // 2. Process all approved drafts in sending queue
    if (action === 'process_queue') {
      const allDrafts = await getDrafts({ status: 'approved' });
      const { leads } = await getLeads();
      const leadsMap = new Map<string, Lead>();
      leads.forEach((l) => leadsMap.set(l.id, l));

      const results = [];
      const errors = [];

      for (const draft of allDrafts) {
        const lead = leadsMap.get(draft.leadId);
        if (!lead) continue;

        try {
          const res = await sendOutreachEmail({ lead, draft });
          results.push(res);
        } catch (err: any) {
          console.error(`[SendQueue] Failed sending to ${lead.email}:`, err);
          errors.push({ draftId: draft.id, email: lead.email, error: err.message });
        }
      }

      return NextResponse.json({
        success: true,
        sentCount: results.length,
        failedCount: errors.length,
        results,
        errors,
      });
    }

    // 3. Send test email to verify connected account
    if (action === 'send_test') {
      const { accountId, toEmail } = body;
      if (!accountId || !toEmail) {
        return NextResponse.json({ error: 'accountId and toEmail are required' }, { status: 400 });
      }

      const account = await getAccountById(accountId);
      if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      const testLead: Lead = {
        id: `test-lead-${Date.now()}`,
        name: 'Deliverability Tester',
        email: toEmail,
        businessName: 'Deliverability Test Bed',
        niche: 'other',
        status: 'new',
        followUpCount: 0,
        createdAt: new Date().toISOString(),
      };

      const testDraft = {
        id: `test-draft-${Date.now()}`,
        leadId: testLead.id,
        type: 'initial' as const,
        subject: `[Test] Deliverability & OAuth Verification from ${account.gmailAddress}`,
        body: `Hi,\n\nThis is a verification test from your Agentic Outreach platform.\n\nConnected Sender: ${account.gmailAddress}\nDaily Limit: ${account.dailyLimit}\nSent Today: ${account.sentToday}\n\nAll systems operational.\n\nReply STOP to unsubscribe.`,
        aiProvider: 'mock' as const,
        model: 'system-test',
        status: 'approved' as const,
        createdAt: new Date().toISOString(),
      };

      const result = await sendOutreachEmail({
        lead: testLead,
        draft: testDraft,
        accountOverride: account,
      });

      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('[API /api/send POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Send operation failed' }, { status: 500 });
  }
}
