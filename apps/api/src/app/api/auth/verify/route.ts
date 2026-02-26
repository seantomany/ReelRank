import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { handleApiError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const { user, requestId } = await authenticateRequest(req);
    return NextResponse.json({ data: user, requestId });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
