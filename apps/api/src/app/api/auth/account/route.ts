import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { getAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { firestore } from 'firebase-admin';

const BATCH_SIZE = 400;

async function deleteQueryInBatches(
  query: firestore.Query,
): Promise<void> {
  while (true) {
    const snap = await query.limit(BATCH_SIZE).get();
    if (snap.empty) return;
    const batch = getDb().batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    if (snap.size < BATCH_SIZE) return;
  }
}

export const DELETE = withAuth(async (_req: NextRequest, { user, requestId }) => {
  const db = getDb();
  const uid = user.id;

  const roomsSnap = await db
    .collection(COLLECTIONS.rooms)
    .where('memberUserIds', 'array-contains', uid)
    .get();

  for (const roomDoc of roomsSnap.docs) {
    const roomRef = roomDoc.ref;
    const roomData = roomDoc.data();

    await roomRef.collection('members').doc(uid).delete().catch(() => {});

    await deleteQueryInBatches(roomRef.collection('swipes').where('userId', '==', uid));
    await deleteQueryInBatches(roomRef.collection('movies').where('submittedBy', '==', uid));
    await deleteQueryInBatches(roomRef.collection('bonusRounds').where('userId', '==', uid));

    if (roomData.hostId === uid) {
      const remaining = await roomRef.collection('members').limit(1).get();
      if (remaining.empty) {
        await roomRef.update({
          memberUserIds: FieldValue.arrayRemove(uid),
          status: 'results',
          updatedAt: new Date(),
        });
      } else {
        await roomRef.update({
          memberUserIds: FieldValue.arrayRemove(uid),
          hostId: remaining.docs[0].id,
          updatedAt: new Date(),
        });
      }
    } else {
      await roomRef.update({
        memberUserIds: FieldValue.arrayRemove(uid),
        updatedAt: new Date(),
      });
    }
  }

  await Promise.all([
    deleteQueryInBatches(db.collection(COLLECTIONS.soloSwipes).where('userId', '==', uid)),
    deleteQueryInBatches(db.collection(COLLECTIONS.pairwiseChoices).where('userId', '==', uid)),
    deleteQueryInBatches(db.collection(COLLECTIONS.watchedMovies).where('userId', '==', uid)),
    deleteQueryInBatches(db.collection(COLLECTIONS.ratingComments).where('authorId', '==', uid)),
    deleteQueryInBatches(db.collection(COLLECTIONS.ratingComments).where('targetUserId', '==', uid)),
    deleteQueryInBatches(db.collection(COLLECTIONS.friendRequests).where('fromUserId', '==', uid)),
    deleteQueryInBatches(db.collection(COLLECTIONS.friendRequests).where('toUserId', '==', uid)),
    deleteQueryInBatches(db.collection(COLLECTIONS.friendships).where('userIds', 'array-contains', uid)),
  ]);

  await db.collection(COLLECTIONS.rankedLists).doc(uid).delete().catch(() => {});
  await db.collection(COLLECTIONS.users).doc(uid).delete().catch(() => {});

  try {
    await getAuth().deleteUser(uid);
  } catch (err) {
    console.error(`[${requestId}] Failed to delete Firebase Auth user ${uid}:`, err);
  }

  return NextResponse.json({
    data: { deleted: true },
    requestId,
  });
});
