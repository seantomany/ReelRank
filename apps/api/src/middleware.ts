import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://reelrank.vercel.app',
  'https://www.reelrank.vercel.app',
  process.env.ALLOWED_ORIGIN,
].filter(Boolean) as string[];

// Allow localhost in development
if (process.env.NODE_ENV !== 'production') {
  ALLOWED_ORIGINS.push('http://localhost:3000', 'http://localhost:3001');
}

function getAllowedOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin') ?? '';
  // Mobile apps send no origin — allow them
  if (!origin) return '*';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  return ALLOWED_ORIGINS[0];
}

export function middleware(request: NextRequest) {
  const allowedOrigin = getAllowedOrigin(request);

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Real-IP',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Real-IP');
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
