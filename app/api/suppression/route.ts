import { NextRequest, NextResponse } from 'next/server';
import {
  getSuppressionEntries,
  addSuppressedEmail,
  removeSuppressedEmail,
} from '@/lib/firebase/suppression';

export async function GET() {
  try {
    const list = await getSuppressionEntries();
    return NextResponse.json({ success: true, suppressionList: list, total: list.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch suppression list' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, reason, leadId } = body;

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const entry = await addSuppressedEmail(email, reason || 'user_requested', leadId);
    return NextResponse.json({ success: true, entry });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add to suppression list' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'email query param is required' }, { status: 400 });
    }

    const removed = await removeSuppressedEmail(email);
    return NextResponse.json({ success: true, removed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to remove from suppression list' }, { status: 500 });
  }
}
