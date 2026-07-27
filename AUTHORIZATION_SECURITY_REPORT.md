# AUTHORIZATION SECURITY REPORT

**Date:** 2026-07-24  
**Phase:** 12 — Production Gap Closure  
**Audit Finding:** `JwtAuthGuard` not globally enforced. `OcrController` and `ReviewController` lacked authentication guards.

---

## Audit Findings Summary

| Controller | Before | After |
|------------|--------|-------|
| `AuthController` | Public (correct — login endpoint) | Public (unchanged) |
| `FilesController` | ✅ Had `@UseGuards(JwtAuthGuard, PermissionsGuard)` | ✅ Retained (with real PrismaService wired) |
| `OcrController` | ❌ **No class-level guard** (only `@RequirePermissions` which is no-op without JWT guard) | ✅ `@UseGuards(JwtAuthGuard, PermissionsGuard)` at class level |
| `ReviewController` | ❌ **No JWT guard** at all — completely unprotected | ✅ `@UseGuards(JwtAuthGuard, PermissionsGuard)` at class level |
| `BatchSyncController` | ❌ **No guards** — any request could trigger ERP sync | ✅ `@UseGuards(JwtAuthGuard, PermissionsGuard)` at class level |
| `ManualReviewController` | ✅ Had guards | ✅ Retained + wired to real database |
| `StudentManualReviewController` | ✅ Had guards | ✅ Retained |
| `StudentTransactionsController` | ✅ Had guards | ✅ Retained |

---

## Implementation Details

### Guard Architecture

The `JwtAuthGuard` extends NestJS `AuthGuard('jwt')` using Passport JWT strategy.

```typescript
// jwt-auth.guard.ts — supports @Public() bypass
canActivate(context: ExecutionContext) {
  const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [...]);
  if (isPublic) return true;          // @Public() bypasses JWT check
  return super.canActivate(context);  // Validates Bearer token via JwtStrategy
}
```

### Public Endpoints (Intentionally Open)
- `GET /auth/csrf` — CSRF token retrieval
- `POST /auth/login` — Login (decorated with `@Public()`)
- `POST /auth/refresh` — Token refresh (decorated with `@Public()`)
- `GET /health/*` — Health check endpoints

### Protected Endpoints (All Require JWT)
- `POST /files/upload` — requires `Invoice.Upload` permission
- `POST /ocr/process/:fileId` — requires `Invoice.Process` permission
- `GET /ocr/:fileId/status` — requires `Invoice.Read` permission
- `GET /vendor-slips/review` — requires `Invoice.Read` permission
- `PUT /vendor-slips/:id/approve` — requires `Invoice.Process` permission
- `POST /api/vendor-slips/batch-sync` — requires `Invoice.Process` permission
- `POST /api/vendor-slips/batch-sync/:id/retry` — requires `Invoice.Process` permission
- `GET /api/vendor-slips/batch-sync/:id` — requires `Invoice.Read` permission
- `GET /manual-review` — requires `ManualReview.Read` permission
- `GET /manual-review/:id` — requires `ManualReview.Read` permission
- `POST /manual-review/:id/approve` — requires `ManualReview.Resolve` permission
- `POST /manual-review/:id/reject` — requires `ManualReview.Resolve` permission

---

## Verification

| Scenario | Expected | Mechanism |
|----------|----------|-----------|
| Request without `Authorization: Bearer <token>` | 401 Unauthorized | `JwtAuthGuard.handleRequest()` throws `UnauthenticatedException` |
| Request with expired JWT | 401 Unauthorized | `JwtAuthGuard.handleRequest()` detects `TokenExpiredError` → `ExpiredTokenException` |
| Request with valid JWT, insufficient permissions | 403 Forbidden | `PermissionsGuard.canActivate()` throws `ForbiddenException` |
| Request with valid JWT, correct permissions | 200 OK | Both guards pass; handler executes |

> **Note**: Runtime evidence requires a live PostgreSQL instance with seeded users and roles. Guard logic is statically verifiable by code inspection.
