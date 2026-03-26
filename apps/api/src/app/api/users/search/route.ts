import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';

export const GET = withAuth(async (req: NextRequest, { user, requestId }) => {
  const query = req.nextUrl.searchParams.get('q')?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ data: [], requestId });
  }

  const usersSnap = await getDb()
    .collection(COLLECTIONS.users)
    .where('email', '>=', query.toLowerCase())
    .where('email', '<=', query.toLowerCase() + '\uf8ff')
    .limit(10)
    .get();

  const usernameSnap = await getDb()
    .collection(COLLECTIONS.users)
    .where('username', '>=', query.toLowerCase())
    .where('username', '<=', query.toLowerCase() + '\uf8ff')
    .limit(10)
    .get();

  const seen = new Set<string>();
  const results: any[] = [];

  for (const snap of [usersSnap, usernameSnap]) {
    for (const doc of snap.docs) {
      if (seen.has(doc.id) || doc.id === user.id) continue;
      seen.add(doc.id);
      const d = doc.data();
      results.push({
        id: doc.id,
        displayName: d.displayName ?? d.username ?? d.email?.split('@')[0],
        username: d.username ?? null,
        photoUrl: d.photoUrl ?? null,
        email: d.email,
      });
    }
  }

  return NextResponse.json({ data: results.slice(0, 10), requestId });
});
