import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getOwnedSavedCode(request: Request, savedCodeId: string) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return { user: null, savedCode: null } as const;
  }

  const savedCode = await prisma.savedCode.findUnique({
    where: { id: savedCodeId },
    select: {
      id: true,
      title: true,
      code: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!savedCode || savedCode.userId !== user.id) {
    return { user, savedCode: null } as const;
  }

  return { user, savedCode } as const;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, savedCode } = await getOwnedSavedCode(request, id);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!savedCode) {
    return NextResponse.json({ error: 'Saved program not found.' }, { status: 404 });
  }

  return NextResponse.json({ savedCode });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, savedCode } = await getOwnedSavedCode(request, id);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!savedCode) {
    return NextResponse.json({ error: 'Saved program not found.' }, { status: 404 });
  }

  await prisma.savedCode.delete({ where: { id: savedCode.id } });

  return NextResponse.json({ deleted: true, id: savedCode.id });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, savedCode } = await getOwnedSavedCode(request, id);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!savedCode) {
    return NextResponse.json({ error: 'Saved program not found.' }, { status: 404 });
  }

  try {
    const body = (await request.json()) as { title?: unknown; code?: unknown };
    const title = typeof body.title === 'string' ? body.title.trim() : savedCode.title;
    const code = typeof body.code === 'string' ? body.code : savedCode.code;

    if (!title) {
      return NextResponse.json({ error: 'Please provide a title for this program.' }, { status: 400 });
    }
    if (title.length > 120) {
      return NextResponse.json({ error: 'Title must be 120 characters or fewer.' }, { status: 400 });
    }
    if (!code.trim()) {
      return NextResponse.json({ error: 'You cannot save an empty program.' }, { status: 400 });
    }

    const updatedCode = await prisma.savedCode.update({
      where: { id: savedCode.id },
      data: { title, code },
    });

    return NextResponse.json({ savedCode: updatedCode });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to update your program right now.' }, { status: 500 });
  }
}
