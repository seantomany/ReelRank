import { randomUUID } from 'crypto';

export function createRequestId(): string {
  return randomUUID().slice(0, 8);
}

export class ApiError extends Error {
  statusCode: number;
  requestId: string;

  constructor(statusCode: number, message: string, requestId?: string) {
    super(message);
    this.statusCode = statusCode;
    this.requestId = requestId ?? createRequestId();
    this.name = 'ApiError';
  }
}

export function createApiError(statusCode: number, message: string, requestId?: string): ApiError {
  return new ApiError(statusCode, message, requestId);
}

export function handleApiError(error: unknown, requestId?: string) {
  if (error instanceof ApiError) {
    return {
      status: error.statusCode,
      body: { error: error.message, requestId: error.requestId },
    };
  }

  const rid = requestId ?? createRequestId();
  console.error(`[${rid}] Unhandled error:`, error);

  return {
    status: 500,
    body: { error: 'Internal server error', requestId: rid },
  };
}
