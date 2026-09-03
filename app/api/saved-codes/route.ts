import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../lib/auth';
import { prisma } from '../../lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const savedCodes = await prisma.savedCode.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      code: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ savedCodes });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { title?: unknown; code?: unknown; language?: unknown };
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const code = typeof body.code === 'string' ? body.code : '';
    const language = body.language === 'javascript' ? 'javascript' : 'c';

    if (!title) {
      return NextResponse.json({ error: 'Please provide a title for this program.' }, { status: 400 });
    }

    if (title.length > 120) {
      return NextResponse.json({ error: 'Title must be 120 characters or fewer.' }, { status: 400 });
    }

    if (!code.trim()) {
      return NextResponse.json({ error: 'You cannot save an empty program.' }, { status: 400 });
    }

    const savedCode = await prisma.savedCode.create({
      data: {
        userId: user.id,
        title,
        code,
        language,
      },
    });

    return NextResponse.json({ savedCode }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Unable to save your program right now.' }, { status: 500 });
  }
}
