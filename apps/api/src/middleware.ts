import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = new Set([
  'https://reelrank.vercel.app',
  'https://reel-rank-web.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
]);

// Add any custom origin from env
if (process.env.ALLOWED_ORIGIN) {
  ALLOWED_ORIGINS.add(process.env.ALLOWED_ORIGIN);
}

function getAllowedOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin') ?? '';
  // No origin = mobile app or server-to-server — allow
  if (!origin) return '*';
  // Vercel preview deployments
  if (origin.endsWith('.vercel.app')) return origin;
  // Explicit whitelist
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  return '';
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
