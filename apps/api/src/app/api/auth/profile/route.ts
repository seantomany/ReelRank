import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { parseJsonBody } from '@/lib/route-helpers';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { UpdateProfileInputSchema } from '@reelrank/shared';
import { ApiError } from '@/lib/errors';

export const PATCH = withAuth(async (req, { user, requestId }) => {
  const body = await parseJsonBody<unknown>(req, requestId);
  const parsed = UpdateProfileInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Invalid input', requestId);
  }

  const { username } = parsed.data;
  const lowerUsername = username.toLowerCase();

  const existing = await getDb()
    .collection(COLLECTIONS.users)
    .where('usernameLower', '==', lowerUsername)
    .limit(1)
    .get();

  if (!existing.empty && existing.docs[0].id !== user.id) {
    throw new ApiError(409, 'Username is already taken', requestId);
  }

  const now = new Date();
  await getDb().collection(COLLECTIONS.users).doc(user.id).update({
    username,
    usernameLower: lowerUsername,
    updatedAt: now,
  });

  return NextResponse.json({
    data: { ...user, username, updatedAt: now },
    requestId,
  });
});
