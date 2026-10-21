import { NextRequest, NextResponse } from 'next/server';
import { generateAnalyticsReport } from '@/lib/reports/analytics';
import { dispatchDailyDigest } from '@/lib/reports/digest';

export async function GET() {
  try {
    const report = await generateAnalyticsReport();
    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error('Reports GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate analytics report' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'dispatch_digest') {
      const result = await dispatchDailyDigest();
      return NextResponse.json({
        success: true,
        message: 'Daily outreach digest dispatched to Telegram & Owner Email!',
        result,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Reports POST Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to dispatch report' },
      { status: 500 }
    );
  }
}
