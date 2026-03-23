import { NextRequest } from 'next/server';
import { getAuth } from './firebase-admin';
import { getDb, COLLECTIONS } from './firestore';
import { ApiError } from './errors';
import type { User } from '@reelrank/shared';

export async function authenticateRequest(
  req: NextRequest
): Promise<User> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing or invalid authorization header');
  }

  const token = authHeader.slice(7);
  let decodedToken;
  try {
    decodedToken = await getAuth().verifyIdToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const uid = decodedToken.uid;
  const userRef = getDb().collection(COLLECTIONS.users).doc(uid);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    const data = userDoc.data()!;
    return {
      id: uid,
      firebaseUid: uid,
      email: data.email,
      displayName: data.displayName,
      photoUrl: data.photoUrl,
      createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt,
    };
  }

  const now = new Date();
  const newUser: User = {
    id: uid,
    firebaseUid: uid,
    email: decodedToken.email ?? '',
    displayName: decodedToken.name ?? null,
    photoUrl: decodedToken.picture ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await userRef.set(newUser);
  return newUser;
}
