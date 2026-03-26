import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { ApiError } from '@/lib/errors';

const MAX_PHOTO_SIZE = 200_000; // ~200KB base64

export const POST = withAuth(async (req: NextRequest, { user, requestId }) => {
  const body = await req.json().catch(() => null);
  const photoUrl = body?.photoUrl;

  if (!photoUrl || typeof photoUrl !== 'string') {
    throw new ApiError(400, 'photoUrl is required', requestId);
  }

  if (photoUrl.length > MAX_PHOTO_SIZE) {
    throw new ApiError(400, 'Photo is too large. Please use a smaller image.', requestId);
  }

  await getDb().collection(COLLECTIONS.users).doc(user.id).update({
    photoUrl,
    updatedAt: new Date(),
  });

  return NextResponse.json({ data: { photoUrl }, requestId });
});

export const DELETE = withAuth(async (_req: NextRequest, { user, requestId }) => {
  await getDb().collection(COLLECTIONS.users).doc(user.id).update({
    photoUrl: null,
    updatedAt: new Date(),
  });

  return NextResponse.json({ data: { photoUrl: null }, requestId });
});
