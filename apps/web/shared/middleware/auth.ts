import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { env } from '../config/env';

export async function AuthorizationMiddleware(req: NextRequest) {
  const token = await getToken({ req, secret: env.NEXTAUTH_SECRET });
  
  if (!token) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  // Check required roles if passed via route config (mock logic)
  const requiredRole = req.headers.get('x-required-role');
  if (requiredRole && token.role !== requiredRole) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  return NextResponse.next();
}
