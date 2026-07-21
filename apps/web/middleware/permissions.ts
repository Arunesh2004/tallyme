/**
 * File: apps/web/middleware/permissions.ts
 * Purpose: Edge middleware logic to verify RBAC (Role-Based Access Control) on specific routes.
 * Dependencies: next/server
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Mapping of route prefixes to required roles
// In Edge middleware, we would decode the JWT from a secure cookie to read the role.
// For this foundation layer, this acts as the structure.
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/settings': ['SUPER_ADMIN', 'ADMINISTRATOR'],
  '/reports': ['ACCOUNTANT', 'PRINCIPAL', 'SUPER_ADMIN'],
};

export function permissionsMiddleware(request: NextRequest, userRole: string | null) {
  const pathname = request.nextUrl.pathname;

  // Check if the current path requires specific permissions
  for (const [route, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(route)) {
      if (!userRole || !allowedRoles.includes(userRole)) {
        // Unauthorized
        const unauthorizedUrl = new URL('/403', request.url);
        return NextResponse.rewrite(unauthorizedUrl);
      }
    }
  }

  return NextResponse.next();
}
