import { NextRequest, NextResponse } from 'next/server';
import {
  getAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
  saveAccount,
} from '@/lib/firebase/accounts';
import { getRecommendedLimitForWarmup } from '@/lib/gmail/rotation';

export async function GET() {
  try {
    const accounts = await getAccounts();
    const activeAccounts = accounts.filter((a) => a.status === 'active');
    const totalDailyCapacity = activeAccounts.reduce((acc, a) => acc + (a.dailyLimit || 0), 0);
    const sentTodayTotal = activeAccounts.reduce((acc, a) => acc + (a.sentToday || 0), 0);

    return NextResponse.json({
      success: true,
      accounts,
      total: accounts.length,
      activeCount: activeAccounts.length,
      totalDailyCapacity,
      sentTodayTotal,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch accounts' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Account id is required' }, { status: 400 });
    }

    // Auto-adjust dailyLimit if warmupLevel is updated
    if (updates.warmupLevel && !updates.dailyLimit) {
      updates.dailyLimit = getRecommendedLimitForWarmup(updates.warmupLevel);
    }

    const updated = await updateAccount(id, updates);
    return NextResponse.json({ success: true, account: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update account' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Account id query param is required' }, { status: 400 });
    }

    const deleted = await deleteAccount(id);
    return NextResponse.json({ success: true, deleted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete account' }, { status: 500 });
  }
}
