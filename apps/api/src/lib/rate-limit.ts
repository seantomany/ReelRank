import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';
import { NextRequest, NextResponse } from 'next/server';
import { createRequestId } from './errors';

const rateLimiters = {
  movieSearch: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '60 s'),
    prefix: 'rl:movie-search',
  }),
  roomJoin: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '60 s'),
    prefix: 'rl:room-join',
  }),
  general: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '60 s'),
    prefix: 'rl:general',
  }),
};

export type RateLimitType = keyof typeof rateLimiters;

export async function checkRateLimit(
  identifier: string,
  type: RateLimitType = 'general',
): Promise<{ success: boolean; remaining: number }> {
  const limiter = rateLimiters[type];
  const result = await limiter.limit(identifier);
  return { success: result.success, remaining: result.remaining };
}

export async function withRateLimit(
  req: NextRequest,
  type: RateLimitType = 'general',
): Promise<NextResponse | null> {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const result = await checkRateLimit(ip, type);

  if (!result.success) {
    const requestId = createRequestId();
    return NextResponse.json(
      { error: 'Too many requests', requestId },
      {
        status: 429,
        headers: { 'X-RateLimit-Remaining': String(result.remaining) },
      },
    );
  }

  return null;
}
