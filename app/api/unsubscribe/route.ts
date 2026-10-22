import { NextRequest, NextResponse } from 'next/server';
import { addSuppressedEmail } from '@/lib/firebase/suppression';
import { getAdminDb } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (email) {
    try {
      await addSuppressedEmail(email, 'user_requested');

      // Also mark lead status if exists
      const db = getAdminDb();
      if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
        const snap = await db.collection('leads').where('email', '==', email.toLowerCase().trim()).get();
        if (!snap.empty) {
          const batchOp = db.batch();
          snap.docs.forEach((doc) => {
            batchOp.update(doc.ref, { status: 'unsubscribed', updatedAt: new Date().toISOString() });
          });
          await batchOp.commit();
        }
      }
    } catch (err) {
      console.warn('[Unsubscribe] Failed to suppress email:', err);
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Unsubscribed Successfully</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { max-width: 440px; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
    .icon { font-size: 40px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 700; margin: 0 0 12px 0; color: #ffffff; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 20px 0; }
    .email { font-mono font-weight: 600; color: #38bdf8; word-break: break-all; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>You're Unsubscribed</h1>
    <p>The email <span class="email">${email ? String(email) : 'address'}</span> has been permanently removed from our outreach list. You will not receive any further emails.</p>
    <p style="font-size: 12px; color: #64748b;">If this was a mistake, feel free to reply to the original email or contact skahidulla568@gmail.com</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let email = searchParams.get('email');

  if (!email) {
    try {
      const body = await req.json();
      email = body.email;
    } catch {
      // ignore
    }
  }

  if (email) {
    await addSuppressedEmail(email, 'user_requested');
  }

  return NextResponse.json({ success: true, message: 'Unsubscribed successfully' });
}
