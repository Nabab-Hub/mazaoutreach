import { NextRequest, NextResponse } from 'next/server';
import { aiRouter } from '@/lib/ai/router';

let systemSettings = {
  ownerEmail: process.env.OWNER_EMAIL || 'owner@freelancestudio.io',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  calendarBookingLink: process.env.CALENDAR_BOOKING_LINK || 'https://cal.com/alexvance/10min',
  autonomyLevel: 0, // L0 (default - everything needs approval)
  sendWindowStart: '09:00',
  sendWindowEnd: '18:00',
  timezone: 'Asia/Kolkata',
  dailyTotalLimit: 50,
  minDelaySeconds: 45,
  maxDelaySeconds: 180,
};

export async function GET() {
  try {
    const aiConfig = aiRouter.getConfig();
    const availableProviders = aiRouter.getAvailableProviders();

    return NextResponse.json({
      success: true,
      settings: systemSettings,
      aiConfig,
      availableProviders,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { settings, aiConfig } = body;

    if (settings) {
      systemSettings = { ...systemSettings, ...settings };
    }

    if (aiConfig) {
      aiRouter.updateConfig(aiConfig);
    }

    return NextResponse.json({
      success: true,
      settings: systemSettings,
      aiConfig: aiRouter.getConfig(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update settings' }, { status: 500 });
  }
}
