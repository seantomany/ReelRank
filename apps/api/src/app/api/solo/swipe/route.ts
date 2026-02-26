import { NextRequest, NextResponse } from 'next/server';
import { SoloSwipeInputSchema } from '@reelrank/shared';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';

export const POST = withAuth(async (req: NextRequest, { user, requestId }: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const parsed = SoloSwipeInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten(), requestId },
        { status: 400 },
      );
    }

    const swipe = await prisma.soloSwipe.upsert({
      where: { userId_movieId: { userId: user.id, movieId: parsed.data.movieId } },
      update: { direction: parsed.data.direction },
      create: {
        userId: user.id,
        movieId: parsed.data.movieId,
        direction: parsed.data.direction,
      },
    });

    return NextResponse.json({ data: swipe, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
});
