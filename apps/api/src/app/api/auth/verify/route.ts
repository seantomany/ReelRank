import { NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware';

export const POST = withAuthAndRateLimit('general', async (_req, { user, requestId }) => {
  return NextResponse.json({ data: user, requestId });
});
