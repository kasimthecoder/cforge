import { NextResponse } from 'next/server';
import { clearSessionCookie, getSessionTokenFromRequest } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const sessionToken = await getSessionTokenFromRequest(request);

  if (sessionToken) {
    await prisma.session.deleteMany({
      where: {
        sessionToken,
      },
    });
  }

  const response = NextResponse.json({ ok: true });
  return clearSessionCookie(response);
}
