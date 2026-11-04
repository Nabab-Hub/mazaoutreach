import { NextResponse } from 'next/server';
import { checkAgenticAiHealth, AGENTIC_AI_URL } from '@/lib/agentic-ai/client';

export async function GET() {
  try {
    const health = await checkAgenticAiHealth();

    return NextResponse.json({
      success: true,
      connected: health.available,
      url: AGENTIC_AI_URL,
      status: health.available ? 'online' : 'offline_fallback',
      details: health.data || null,
      message: health.available
        ? 'Agentic AI Python Multi-Agent Engine is active and connected.'
        : 'Agentic AI Python service is offline; using built-in Next.js AI fallback router.',
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        connected: false,
        url: AGENTIC_AI_URL,
        error: err.message,
      },
      { status: 500 }
    );
  }
}
