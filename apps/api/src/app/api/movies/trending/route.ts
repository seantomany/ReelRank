import { NextRequest, NextResponse } from 'next/server';
import { withRateLimitMiddleware } from '@/lib/middleware';
import { getTrending } from '@/lib/tmdb';
import { TrendingPageSchema } from '@reelrank/shared';
import { ApiError } from '@/lib/errors';

export const GET = withRateLimitMiddleware('general', async (req: NextRequest, { requestId }) => {
  const url = new URL(req.url);
  const parsed = TrendingPageSchema.safeParse({
    page: url.searchParams.get('page') ?? '1',
  });

  if (!parsed.success) {
    throw new ApiError(400, 'Invalid page parameter', requestId);
  }

  const result = await getTrending(parsed.data.page);
  return NextResponse.json({ data: result, requestId });
});
