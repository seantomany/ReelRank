import { NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware';
import { parseJsonBody } from '@/lib/route-helpers';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { SoloSwipeInputSchema } from '@reelrank/shared';
import { ApiError } from '@/lib/errors';

export const POST = withAuthAndRateLimit('general', async (req, { user, requestId }) => {
  const body = await parseJsonBody<unknown>(req, requestId);
  const parsed = SoloSwipeInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Invalid input', requestId);
  }

  const { movieId, direction } = parsed.data;
  const docId = `${user.id}_${movieId}`;
  const now = new Date();

  await getDb().collection(COLLECTIONS.soloSwipes).doc(docId).set({
    id: docId,
    userId: user.id,
    movieId,
    direction,
    createdAt: now,
  }, { merge: true });

  return NextResponse.json({ data: { id: docId, movieId, direction }, requestId });
});
