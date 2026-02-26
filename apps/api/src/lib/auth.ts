import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from './firebase-admin';
import { prisma } from './prisma';
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

  let user = await prisma.user.findUnique({
    where: { firebaseUid: decodedToken.uid },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        firebaseUid: decodedToken.uid,
        email: decodedToken.email ?? `${decodedToken.uid}@unknown.com`,
        displayName: decodedToken.name ?? null,
        photoUrl: decodedToken.picture ?? null,
      },
    });
  }

  return {
    user: {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      displayName: user.displayName,
      photoUrl: user.photoUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    requestId,
  };
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
