import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';

export const POST = withAuth(async (req: NextRequest, { user, requestId }) => {
  const body = await req.json().catch(() => null);
  const token = body?.pushToken;

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'pushToken is required', requestId }, { status: 400 });
  }

  await getDb().collection(COLLECTIONS.users).doc(user.id).set(
    { pushToken: token, pushTokenUpdatedAt: new Date() },
    { merge: true }
  );

  return NextResponse.json({ data: { saved: true }, requestId });
});
