import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { ApiError } from '@/lib/errors';

export const GET = withAuthAndRateLimit('general', async (_req: NextRequest, { user, requestId }) => {
  try {
    const snap = await getDb()
      .collection(COLLECTIONS.friendRequests)
      .where('toUserId', '==', user.id)
      .where('status', '==', 'pending')
      .limit(50)
      .get();

    const requests = [];
    for (const doc of snap.docs) {
      const d = doc.data();
      const fromUser = await getDb().collection(COLLECTIONS.users).doc(d.fromUserId).get();
      const fu = fromUser.data();
      requests.push({
        id: doc.id,
        fromUserId: d.fromUserId,
        fromDisplayName: fu?.displayName ?? fu?.username ?? fu?.email?.split('@')[0] ?? 'Unknown',
        fromPhotoUrl: fu?.photoUrl ?? null,
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? d.createdAt,
      });
    }

    return NextResponse.json({ data: requests, requestId });
  } catch (error) {
    console.error('Failed to fetch friend requests:', error);
    return NextResponse.json({ data: [], requestId });
  }
});

export const POST = withAuthAndRateLimit('general', async (req: NextRequest, { user, requestId }) => {
  const body = await req.json().catch(() => null);
  const toUserId = body?.toUserId;
  if (!toUserId || typeof toUserId !== 'string') {
    throw new ApiError(400, 'toUserId is required', requestId);
  }

  if (toUserId === user.id) {
    throw new ApiError(400, 'Cannot send a friend request to yourself', requestId);
  }

  const targetUser = await getDb().collection(COLLECTIONS.users).doc(toUserId).get();
  if (!targetUser.exists) {
    throw new ApiError(404, 'User not found', requestId);
  }

  const existingFriendship = await getDb()
    .collection(COLLECTIONS.friendships)
    .where('userIds', 'array-contains', user.id)
    .get();
  const alreadyFriends = existingFriendship.docs.some((d) => {
    const ids = d.data().userIds as string[];
    return ids.includes(toUserId);
  });
  if (alreadyFriends) {
    throw new ApiError(400, 'Already friends', requestId);
  }

  const existingRequest = await getDb()
    .collection(COLLECTIONS.friendRequests)
    .where('fromUserId', '==', user.id)
    .where('toUserId', '==', toUserId)
    .where('status', '==', 'pending')
    .limit(1)
    .get();
  if (!existingRequest.empty) {
    throw new ApiError(400, 'Request already sent', requestId);
  }

  const reverseRequest = await getDb()
    .collection(COLLECTIONS.friendRequests)
    .where('fromUserId', '==', toUserId)
    .where('toUserId', '==', user.id)
    .where('status', '==', 'pending')
    .limit(1)
    .get();
  if (!reverseRequest.empty) {
    const reqDoc = reverseRequest.docs[0];
    await reqDoc.ref.update({ status: 'accepted' });
    await getDb().collection(COLLECTIONS.friendships).add({
      userIds: [user.id, toUserId],
      createdAt: new Date(),
    });
    return NextResponse.json({
      data: { accepted: true, message: 'They already sent you a request — you are now friends!' },
      requestId,
    });
  }

  await getDb().collection(COLLECTIONS.friendRequests).add({
    fromUserId: user.id,
    toUserId,
    status: 'pending',
    createdAt: new Date(),
  });

  return NextResponse.json({ data: { sent: true }, requestId });
});

export const PATCH = withAuthAndRateLimit('general', async (req: NextRequest, { user, requestId }) => {
  const body = await req.json().catch(() => null);
  const friendReqId = body?.requestId;
  const action = body?.action;

  if (!friendReqId || !['accept', 'reject'].includes(action)) {
    throw new ApiError(400, 'requestId and action (accept|reject) required', requestId);
  }

  const reqDoc = await getDb().collection(COLLECTIONS.friendRequests).doc(friendReqId).get();
  if (!reqDoc.exists) {
    throw new ApiError(404, 'Request not found', requestId);
  }

  const data = reqDoc.data()!;
  if (data.toUserId !== user.id) {
    throw new ApiError(403, 'Not your request', requestId);
  }
  if (data.status !== 'pending') {
    throw new ApiError(400, 'Request already handled', requestId);
  }

  if (action === 'accept') {
    await reqDoc.ref.update({ status: 'accepted' });
    await getDb().collection(COLLECTIONS.friendships).add({
      userIds: [data.fromUserId, user.id],
      createdAt: new Date(),
    });
    return NextResponse.json({ data: { accepted: true }, requestId });
  } else {
    await reqDoc.ref.update({ status: 'rejected' });
    return NextResponse.json({ data: { rejected: true }, requestId });
  }
});
