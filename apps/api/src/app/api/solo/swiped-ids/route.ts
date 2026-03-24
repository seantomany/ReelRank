import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';

export const GET = withAuth(async (_req, { user, requestId }) => {
  const snapshot = await getDb()
    .collection(COLLECTIONS.soloSwipes)
    .where('userId', '==', user.id)
    .select('movieId')
    .get();

  const movieIds = snapshot.docs.map((doc) => doc.data().movieId as number);

  return NextResponse.json({ data: movieIds, requestId });
});
