/**
 * File: apps/web/middleware/auth.ts
 * Purpose: Edge middleware logic to verify authentication status before rendering protected routes.
 * Dependencies: next/server
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function authMiddleware(request: NextRequest) {
  // In Next.js App Router, edge middleware cannot read memory state (Zustand/Variables).
  // It can only read cookies.
  // We check for the HttpOnly refresh token as a proxy for session existence.
  
  const hasRefreshToken = request.cookies.has('refresh_token');
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');

  if (!hasRefreshToken && !isAuthPage) {
    // Redirect unauthenticated users to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (hasRefreshToken && isAuthPage) {
    // Redirect authenticated users away from login
    const dashboardUrl = new URL('/', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}
