import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from './auth';
import { rateLimit, RateLimiterName } from './rate-limit';
import { createRequestId, handleApiError, ApiError } from './errors';
import type { User } from '@reelrank/shared';

type AuthenticatedHandler = (
  req: NextRequest,
  context: { user: User; requestId: string; params?: Record<string, string> }
) => Promise<NextResponse>;

type PublicHandler = (
  req: NextRequest,
  context: { requestId: string; params?: Record<string, string> }
) => Promise<NextResponse>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (req: NextRequest, ctx: any) => Promise<NextResponse>;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

async function resolveParams(ctx: unknown): Promise<Record<string, string> | undefined> {
  if (!ctx || typeof ctx !== 'object') return undefined;
  const c = ctx as { params?: Promise<Record<string, string>> | Record<string, string> };
  if (!c.params) return undefined;
  return await c.params;
}

export function withErrorHandling(handler: PublicHandler): RouteHandler {
  return async (req: NextRequest, ctx: unknown) => {
    const requestId = createRequestId();
    try {
      const params = await resolveParams(ctx);
      return await handler(req, { requestId, params });
    } catch (error) {
      return handleApiError(error, requestId);
    }
  };
}

export function withAuth(handler: AuthenticatedHandler): RouteHandler {
  return async (req: NextRequest, ctx: unknown) => {
    const requestId = createRequestId();
    try {
      const user = await authenticateRequest(req);
      const params = await resolveParams(ctx);
      return await handler(req, { user, requestId, params });
    } catch (error) {
      return handleApiError(error, requestId);
    }
  };
}

export function withRateLimitMiddleware(
  limiterName: RateLimiterName,
  handler: PublicHandler
): RouteHandler {
  return async (req: NextRequest, ctx: unknown) => {
    const requestId = createRequestId();
    try {
      const ip = getClientIp(req);
      const result = await rateLimit(ip, limiterName);
      if (!result.allowed) {
        throw new ApiError(429, 'Too many requests. Please try again later.', requestId);
      }
      const params = await resolveParams(ctx);
      return await handler(req, { requestId, params });
    } catch (error) {
      return handleApiError(error, requestId);
    }
  };
}

export function withAuthAndRateLimit(
  limiterName: RateLimiterName,
  handler: AuthenticatedHandler
): RouteHandler {
  return async (req: NextRequest, ctx: unknown) => {
    const requestId = createRequestId();
    try {
      const ip = getClientIp(req);
      const user = await authenticateRequest(req);
      const rateLimitKey = `${ip}:${user.id}`;
      const result = await rateLimit(rateLimitKey, limiterName);
      if (!result.allowed) {
        throw new ApiError(429, 'Too many requests. Please try again later.', requestId);
      }
      const params = await resolveParams(ctx);
      return await handler(req, { user, requestId, params });
    } catch (error) {
      return handleApiError(error, requestId);
    }
  };
}
