import { NextRequest, NextResponse } from 'next/server';
import { SoloSwipeInputSchema } from '@reelrank/shared';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { handleApiError } from '@/lib/errors';
import { withRateLimit } from '@/lib/rate-limit';
import { parseJsonBody } from '@/lib/route-helpers';

export const POST = withAuth(async (req: NextRequest, { user, requestId }: AuthenticatedRequest) => {
  try {
    const rateLimited = await withRateLimit(req, 'general');
    if (rateLimited) return rateLimited;

    const body = await parseJsonBody(req);
    const parsed = SoloSwipeInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten(), requestId },
        { status: 400 },
      );
    }

    const docId = `${user.id}_${parsed.data.movieId}`;
    const ref = getDb().collection(COLLECTIONS.soloSwipes).doc(docId);

    const data = {
      userId: user.id,
      movieId: parsed.data.movieId,
      direction: parsed.data.direction,
      createdAt: new Date(),
    };

    await ref.set(data, { merge: true });

    return NextResponse.json({ data: { id: docId, ...data }, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error, requestId);
    return NextResponse.json(body, { status });
  }
});
