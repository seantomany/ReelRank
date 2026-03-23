import { NextResponse } from 'next/server';
import { v4 } from './uuid';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function createRequestId(): string {
  return v4();
}

export function handleApiError(
  error: unknown,
  requestId: string
): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, requestId },
      { status: error.statusCode }
    );
  }

  console.error(`[${requestId}] Unhandled error:`, error);
  return NextResponse.json(
    { error: 'Internal server error', requestId },
    { status: 500 }
  );
}
