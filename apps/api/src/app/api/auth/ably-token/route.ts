import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { parseJsonBody } from '@/lib/route-helpers';
import { generateAblyToken } from '@/lib/ably';
import { RoomCodeSchema } from '@reelrank/shared';
import { ApiError } from '@/lib/errors';

export const POST = withAuth(async (req, { user, requestId }) => {
  const body = await parseJsonBody<{ roomCode: string }>(req, requestId);
  const result = RoomCodeSchema.safeParse(body.roomCode);
  if (!result.success) {
    throw new ApiError(400, 'Invalid room code', requestId);
  }

  const token = await generateAblyToken(user.id, result.data);
  return NextResponse.json({ data: token, requestId });
});
