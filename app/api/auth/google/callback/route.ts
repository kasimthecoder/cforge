import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  issueSession,
  verifySignedValue,
} from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserResponse = {
  sub?: string;
  email?: string;
  name?: string;
  email_verified?: boolean;
};

function getBaseUrl() {
  return process.env.APP_BASE_URL ?? 'http://localhost:3000';
}

function redirectWithError(message: string) {
  const url = new URL('/?authError=google', getBaseUrl());
  url.searchParams.set('message', message);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const cookieHeader = request.headers.get('cookie') ?? '';
  const signedStateCookie = cookieHeader
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith('kasim_saifi_oauth_state='))
    ?.split('=')
    .slice(1)
    .join('=');

  if (!state || !code || !signedStateCookie) {
    return redirectWithError('Google login could not be completed.');
  }

  const verifiedState = await verifySignedValue(decodeURIComponent(signedStateCookie));
  if (!verifiedState || verifiedState !== state) {
    return redirectWithError('Google login state verification failed.');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectWithError('Google login is not configured.');
  }

  const redirectUri = `${getBaseUrl()}/api/auth/google/callback`;
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokenPayload = (await tokenResponse.json()) as GoogleTokenResponse;
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    return redirectWithError(tokenPayload.error_description ?? 'Google token exchange failed.');
  }

  const googleUserResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
  });
  const googleUser = (await googleUserResponse.json()) as GoogleUserResponse;
  if (
    !googleUserResponse.ok ||
    !googleUser.sub ||
    !googleUser.email ||
    !googleUser.name ||
    !googleUser.email_verified
  ) {
    return redirectWithError('Google account data is incomplete.');
  }

  const email = googleUser.email.toLowerCase();
  const existingByGoogleId = await prisma.user.findUnique({ where: { googleId: googleUser.sub } });

  let userId: string;
  if (existingByGoogleId) {
    userId = existingByGoogleId.id;
  } else {
    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      const updated = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { googleId: googleUser.sub, name: googleUser.name },
      });
      userId = updated.id;
    } else {
      const created = await prisma.user.create({
        data: {
          email,
          name: googleUser.name,
          googleId: googleUser.sub,
          passwordHash: null,
        },
      });
      userId = created.id;
    }
  }

  const { cookieValue } = await issueSession(userId);

  const response = NextResponse.redirect(new URL('/dashboard', getBaseUrl()));
  response.cookies.set(SESSION_COOKIE_NAME, cookieValue, getSessionCookieOptions());
  response.cookies.set('kasim_saifi_oauth_state', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
