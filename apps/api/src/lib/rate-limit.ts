import { getRedis } from './redis';

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedis();
  const now = Date.now();
  const windowStart = now - config.windowSeconds * 1000;
  const redisKey = `rl:${key}`;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(redisKey, 0, windowStart);
  pipeline.zadd(redisKey, { score: now, member: `${now}-${Math.random()}` });
  pipeline.zcard(redisKey);
  pipeline.expire(redisKey, config.windowSeconds);

  const results = await pipeline.exec();
  const count = results[2] as number;

  return {
    allowed: count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - count),
    resetAt: now + config.windowSeconds * 1000,
  };
}

export const rateLimiters = {
  movieSearch: { maxRequests: 30, windowSeconds: 60 },
  roomJoin: { maxRequests: 10, windowSeconds: 60 },
  general: { maxRequests: 60, windowSeconds: 60 },
} as const;

export type RateLimiterName = keyof typeof rateLimiters;

export async function rateLimit(
  identifier: string,
  limiterName: RateLimiterName
): Promise<RateLimitResult> {
  const config = rateLimiters[limiterName];
  return checkRateLimit(`${limiterName}:${identifier}`, config);
}
