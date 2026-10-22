import { NextRequest, NextResponse } from 'next/server';
import {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleOAuthClientId,
} from '@/lib/gmail/oauth';
import { encryptToken } from '@/lib/crypto/encryption';
import { saveAccount } from '@/lib/firebase/accounts';
import { EmailAccount } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const mockConnect = searchParams.get('mock_connect');

    // 1. Mock connection for local demo mode or quick testing
    if (mockConnect === 'true') {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const mockAccount: EmailAccount = {
        id: `acct-${Date.now()}`,
        gmailAddress: `studio.founder${randomSuffix}@gmail.com`,
        displayName: `Sk Ahidulla (Account #${randomSuffix})`,
        encryptedRefreshToken: encryptToken(`mock_refresh_token_${randomSuffix}`),
        dailyLimit: 25,
        sentToday: 0,
        status: 'active',
        warmupLevel: 1,
        createdAt: new Date().toISOString(),
      };

      await saveAccount(mockAccount);
      return NextResponse.redirect(new URL('/accounts?success=connected', req.url));
    }

    // 2. Google OAuth callback with auth code
    if (code) {
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
    }

    // 3. Initiate Google OAuth redirect
    const authUrl = buildGoogleAuthUrl();
    return NextResponse.redirect(new URL(authUrl, req.url));
  } catch (err: any) {
    console.error('[API /api/gmail/oauth GET] Error:', err);
    return NextResponse.redirect(
      new URL(`/accounts?error=${encodeURIComponent(err.message || 'OAuth failed')}`, req.url)
    );
  }
}
