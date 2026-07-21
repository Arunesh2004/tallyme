import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { env } from '../config/env';

export async function OrganizationMiddleware(req: NextRequest) {
  const token = await getToken({ req, secret: env.NEXTAUTH_SECRET });
  
  if (!token || !token.organizationId) {
    return NextResponse.json({ error: 'TENANT_NOT_FOUND' }, { status: 403 });
  }

  // Inject organizationId into headers so downstream Next.js handlers can extract it
  // and pass it to Prisma for RLS/Tenant isolation.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-organization-id', token.organizationId as string);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
