import { NextRequest, NextResponse } from 'next/server';
import { getReplies, getConversationThread } from '@/lib/firebase/replies';
import { pollActiveInboxes, processInboundReply } from '@/lib/gmail/poll';
import { getLeads } from '@/lib/firebase/leads';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('leadId');

    if (leadId) {
      const thread = await getConversationThread(leadId);
      return NextResponse.json({ success: true, thread, total: thread.length });
    }

    const replies = await getReplies();
    return NextResponse.json({ success: true, replies, total: replies.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch replies' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. Trigger Inbox Polling
    if (action === 'poll') {
      const result = await pollActiveInboxes();
      return NextResponse.json({ success: true, result });
    }

    // 2. Simulate Prospect Reply (for testing & demo purposes)
    if (action === 'simulate') {
      const { leadId, replyBody, replySubject, fromEmail, toAccount } = body;

      const { leads } = await getLeads();
      const targetLead = leadId
        ? leads.find((l) => l.id === leadId)
        : leads.find((l) => l.status === 'contacted') || leads[0];

      if (!targetLead) {
        return NextResponse.json({ error: 'No lead available to simulate reply for.' }, { status: 404 });
      }

      const subject = replySubject || `Re: Question regarding ${targetLead.businessName}`;
      const content =
        replyBody ||
        `Hi Alex,\n\nThanks for following up. We are actually looking to build a new client booking portal next month.\n\nCould you send over your calendar link or let me know your availability for a 10-minute discovery call this Thursday afternoon?\n\nBest,\n${targetLead.name}`;

      const reply = await processInboundReply({
        fromEmail: fromEmail || targetLead.email,
        toAccount: toAccount || targetLead.assignedGmailId || 'alex.consulting@gmail.com',
        subject,
        body: content,
        leadId: targetLead.id,
      });

      return NextResponse.json({
        success: true,
        message: 'Inbound reply processed, classified, response drafted, and alert dispatched!',
        reply,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('[API /api/replies POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Operation failed' }, { status: 500 });
  }
}
