import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/gmail/oauth';
import { encryptToken } from '@/lib/crypto/encryption';
import { saveAccount } from '@/lib/firebase/accounts';
import { EmailAccount } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.warn('[Gmail OAuth Callback] Google returned error:', error);
      return NextResponse.redirect(new URL(`/accounts?error=${encodeURIComponent(error)}`, req.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/accounts?error=No_authorization_code_provided', req.url));
    }

    const tokenResult = await exchangeCodeForTokens(code);
    const encryptedToken = encryptToken(tokenResult.refreshToken);

    const account: EmailAccount = {
      id: `acct-${Date.now()}`,
      gmailAddress: tokenResult.email,
      displayName: tokenResult.name || tokenResult.email.split('@')[0],
      encryptedRefreshToken: encryptedToken,
      dailyLimit: 25,
      sentToday: 0,
      status: 'active',
      warmupLevel: 1,
      createdAt: new Date().toISOString(),
    };

    await saveAccount(account);
    return NextResponse.redirect(new URL('/accounts?success=connected', req.url));
  } catch (err: any) {
    console.error('[API /api/gmail/oauth/callback GET] Error:', err);
    return NextResponse.redirect(
      new URL(`/accounts?error=${encodeURIComponent(err.message || 'OAuth token exchange failed')}`, req.url)
    );
  }
}
