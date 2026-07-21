import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from '../logging/logger';

export function ErrorMiddleware(err: any, req: NextRequest) {
  logger.error({
    action: 'UNHANDLED_EXCEPTION',
    url: req.url,
    error: err.message,
    stack: err.stack,
  });

  return NextResponse.json(
    { 
      error: 'INTERNAL_SERVER_ERROR', 
      message: 'An unexpected error occurred.',
    },
    { status: 500 }
  );
}
