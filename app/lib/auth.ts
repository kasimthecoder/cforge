import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { User } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from './prisma';

export type AuthUser = Pick<User, 'id' | 'email' | 'name'>;

export const SESSION_COOKIE_NAME = 'kasim_saifi_session';
const AUTH_SECRET = process.env.AUTH_SECRET ?? 'development-auth-secret-change-me';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

async function createSignature(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(AUTH_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return Buffer.from(signature).toString('hex');
}

export async function createSignedValue(value: string): Promise<string> {
  const signature = await createSignature(value);
  return `${value}.${signature}`;
}

export async function verifySignedValue(value: string): Promise<string | null> {
  const [rawValue, signature] = value.split('.');

  if (!rawValue || !signature) {
    return null;
  }

  const expectedSignature = await createSignature(rawValue);
  const actualSignature = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (actualSignature.length !== expectedBuffer.length) {
    return null;
  }

  const isValid = timingSafeEqual(actualSignature, expectedBuffer);
  return isValid ? rawValue : null;
}

export async function createSessionCookieValue(sessionToken: string): Promise<string> {
  const signature = await createSignature(sessionToken);
  return `${sessionToken}.${signature}`;
}

export async function verifySessionCookieValue(value: string): Promise<string | null> {
  return verifySignedValue(value);
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  };
}

export async function getSessionTokenFromRequest(request: Request): Promise<string | null> {
  return getSessionTokenFromCookieHeader(request.headers.get('cookie') ?? '');
}

export async function getSessionTokenFromCookieHeader(cookieHeader: string): Promise<string | null> {
  const cookies = cookieHeader.split(';').map((part) => part.trim());

  for (const cookie of cookies) {
    const [name, ...rest] = cookie.split('=');
    if (name !== SESSION_COOKIE_NAME) {
      continue;
    }

    const rawValue = decodeURIComponent(rest.join('='));
    const verifiedToken = await verifySessionCookieValue(rawValue);
    if (verifiedToken) {
      return verifiedToken;
    }

    return null;
  }

  return null;
}

export async function getAuthenticatedUser(request: Request): Promise<AuthUser | null> {
  return getAuthenticatedUserFromCookieHeader(request.headers.get('cookie') ?? '');
}

export async function getAuthenticatedUserFromCookieHeader(
  cookieHeader: string,
): Promise<AuthUser | null> {
  const sessionToken = await getSessionTokenFromCookieHeader(cookieHeader);
  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}

export async function issueSession(userId: string) {
  const sessionToken = randomUUID();
  const cookieValue = await createSessionCookieValue(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      sessionToken,
      expiresAt,
    },
  });

  return { cookieValue, expiresAt };
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    ...getSessionCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
