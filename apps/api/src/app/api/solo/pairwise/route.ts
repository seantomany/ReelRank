import { NextRequest, NextResponse } from 'next/server';
import { PairwiseChoiceInputSchema } from '@reelrank/shared';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';

export const POST = withAuth(async (req: NextRequest, { user, requestId }: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const parsed = PairwiseChoiceInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten(), requestId },
        { status: 400 },
      );
    }

    const choice = await prisma.pairwiseChoice.create({
      data: {
        userId: user.id,
        movieAId: parsed.data.movieAId,
        movieBId: parsed.data.movieBId,
        chosenId: parsed.data.chosenId,
      },
    });

    return NextResponse.json({ data: choice, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
});
