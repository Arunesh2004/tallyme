import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from '../logging/logger';

export async function AuditMiddleware(req: NextRequest) {
  // Capture API mutative requests and log them.
  // In a real implementation, this would enqueue an AuditLog DB record.
  if (req.method !== 'GET') {
    logger.info({
      action: 'API_MUTATION',
      method: req.method,
      url: req.url,
      tenantId: req.headers.get('x-organization-id'),
    });
  }

  return NextResponse.next();
}
