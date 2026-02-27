import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from './firebase-admin';
import { db, COLLECTIONS } from './firestore';
import { createApiError, createRequestId, handleApiError } from './errors';
import type { User } from '@reelrank/shared';

export interface AuthenticatedRequest {
  user: User;
  requestId: string;
}

export async function authenticateRequest(req: NextRequest): Promise<AuthenticatedRequest> {
  const requestId = createRequestId();
  const authHeader = req.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw createApiError(401, 'Missing or invalid authorization header', requestId);
  }

  const idToken = authHeader.slice(7);
  const { auth } = getFirebaseAdmin();

  let decodedToken;
  try {
    decodedToken = await auth.verifyIdToken(idToken);
  } catch {
    throw createApiError(401, 'Invalid or expired token', requestId);
  }

  // Use firebaseUid as document ID for fast lookups
  const userRef = db.collection(COLLECTIONS.users).doc(decodedToken.uid);
  const userSnap = await userRef.get();

  let userData: User;

  if (userSnap.exists) {
    const d = userSnap.data()!;
    userData = {
      id: userSnap.id,
      firebaseUid: d.firebaseUid,
      email: d.email,
      displayName: d.displayName ?? null,
      photoUrl: d.photoUrl ?? null,
      createdAt: d.createdAt?.toDate() ?? new Date(),
      updatedAt: d.updatedAt?.toDate() ?? new Date(),
    };
  } else {
    const now = new Date();
    const newUser = {
      firebaseUid: decodedToken.uid,
      email: decodedToken.email ?? `${decodedToken.uid}@unknown.com`,
      displayName: decodedToken.name ?? null,
      photoUrl: decodedToken.picture ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await userRef.set(newUser);
    userData = { id: decodedToken.uid, ...newUser };
  }

  return { user: userData, requestId };
}

export function withAuth<C = unknown>(
  handler: (req: NextRequest, auth: AuthenticatedRequest, context: C) => Promise<NextResponse>,
) {
  return async (req: NextRequest, context: C) => {
    try {
      const authResult = await authenticateRequest(req);
      return handler(req, authResult, context);
    } catch (error) {
      const { status, body } = handleApiError(error);
      return NextResponse.json(body, { status });
    }
  };
}
