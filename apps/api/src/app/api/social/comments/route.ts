import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { ApiError } from '@/lib/errors';

export const GET = withAuthAndRateLimit('general', async (req: NextRequest, { user, requestId }) => {
  const watchedId = req.nextUrl.searchParams.get('watchedId');
  if (!watchedId) {
    throw new ApiError(400, 'watchedId is required', requestId);
  }

  try {
    const snap = await getDb()
      .collection(COLLECTIONS.ratingComments)
      .where('watchedId', '==', watchedId)
      .limit(50)
      .get();

    const comments = [];
    for (const doc of snap.docs) {
      const d = doc.data();
      const authorDoc = await getDb().collection(COLLECTIONS.users).doc(d.authorId).get();
      const author = authorDoc.data();
      comments.push({
        id: doc.id,
        text: d.text,
        authorId: d.authorId,
        authorName: author?.displayName ?? author?.username ?? 'Unknown',
        authorPhoto: author?.photoUrl ?? null,
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? d.createdAt,
      });
    }

    return NextResponse.json({ data: comments, requestId });
  } catch (error) {
    console.error('Failed to fetch comments:', error);
    return NextResponse.json({ data: [], requestId });
  }
});

export const POST = withAuthAndRateLimit('general', async (req: NextRequest, { user, requestId }) => {
  const body = await req.json().catch(() => null);
  const { watchedId, targetUserId, text } = body ?? {};

  if (!watchedId || !targetUserId || !text?.trim()) {
    throw new ApiError(400, 'watchedId, targetUserId, and text are required', requestId);
  }

  if (text.trim().length > 280) {
    throw new ApiError(400, 'Comment too long (max 280 characters)', requestId);
  }

  const friendships = await getDb()
    .collection(COLLECTIONS.friendships)
    .where('userIds', 'array-contains', user.id)
    .get();
  const isFriend = friendships.docs.some((d) =>
    (d.data().userIds as string[]).includes(targetUserId)
  );
  if (!isFriend && targetUserId !== user.id) {
    throw new ApiError(403, 'You can only comment on friends\' ratings', requestId);
  }

  const docRef = await getDb().collection(COLLECTIONS.ratingComments).add({
    watchedId,
    targetUserId,
    authorId: user.id,
    text: text.trim(),
    createdAt: new Date(),
  });

  return NextResponse.json({
    data: { id: docRef.id, created: true },
    requestId,
  });
});
