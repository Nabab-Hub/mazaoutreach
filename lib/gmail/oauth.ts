import { decryptToken } from '../crypto/encryption';

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export function getGoogleOAuthClientId(): string {
  return (
    process.env.GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_OAUTH_CLIENT_ID ||
    ''
  );
}

export function getGoogleOAuthClientSecret(): string {
  return (
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
    ''
  );
}

export function getGoogleOAuthRedirectUri(): string {
  if (process.env.GOOGLE_OAUTH_REDIRECT_URI) {
    return process.env.GOOGLE_OAUTH_REDIRECT_URI;
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl.replace(/\/$/, '')}/api/gmail/oauth/callback`;
}

/**
 * Builds the Google OAuth2 consent URL
 */
export function buildGoogleAuthUrl(state?: string): string {
  const clientId = getGoogleOAuthClientId();
  const redirectUri = getGoogleOAuthRedirectUri();

  if (!clientId) {
    // Return demo auth trigger if no client ID is set
    return `/api/gmail/oauth?mock_connect=true`;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  });

  if (state) params.set('state', state);

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Exchanges authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  email: string;
  name?: string;
}> {
  const clientId = getGoogleOAuthClientId();
  const clientSecret = getGoogleOAuthClientSecret();
  const redirectUri = getGoogleOAuthRedirectUri();

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google OAuth token exchange failed [${res.status}]: ${errText}`);
  }

  const tokenData = await res.json();
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;

  if (!refreshToken) {
    throw new Error('No refresh token returned by Google. Ensure access_type=offline and prompt=consent.');
  }

  // Fetch user profile info
  const userRes = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const userData = await userRes.json();
  const email = userData.email;

  if (!email) {
    throw new Error('Could not resolve email address from Google userinfo endpoint');
  }

  return {
    accessToken,
    refreshToken,
    email,
    name: userData.name,
  };
}

/**
 * Refreshes an expired access token using the decrypted refresh token
 */
export async function refreshAccessToken(encryptedRefreshToken: string): Promise<string> {
  const plainRefreshToken = decryptToken(encryptedRefreshToken);
  if (!plainRefreshToken || plainRefreshToken.startsWith('mock_')) {
    return 'mock_live_access_token';
  }

  const clientId = getGoogleOAuthClientId();
  const clientSecret = getGoogleOAuthClientSecret();

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: plainRefreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to refresh Google access token: ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
}
