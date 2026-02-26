import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handleApiError, createRequestId } from '@/lib/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const requestId = createRequestId();

  try {
    await authenticateRequest(req);
    const { code } = await params;

    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        members: {
          include: { user: { select: { id: true, displayName: true, photoUrl: true } } },
        },
        movies: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found', requestId }, { status: 404 });
    }

    return NextResponse.json({ data: room, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
}
