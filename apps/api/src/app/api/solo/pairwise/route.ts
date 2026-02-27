import { NextRequest, NextResponse } from 'next/server';
import { PairwiseChoiceInputSchema } from '@reelrank/shared';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/firestore';
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

    const data = {
      userId: user.id,
      movieAId: parsed.data.movieAId,
      movieBId: parsed.data.movieBId,
      chosenId: parsed.data.chosenId,
      createdAt: new Date(),
    };

    const ref = await getDb().collection(COLLECTIONS.pairwiseChoices).add(data);

    return NextResponse.json({ data: { id: ref.id, ...data }, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
});
