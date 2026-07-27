# TallyMe Enterprise — Security Guide

## Authentication

| Control | Implementation | Location |
|---|---|---|
| JWT Tokens | Signed with `JWT_SECRET` (min 32 chars) | `auth` module |
| Token Expiry | Configurable via `JWT_EXPIRATION` env var | `auth.module.ts` |
| Refresh Tokens | Stored in `Session` table, hashed | `Session` model |
| Session Revocation | `isRevoked` flag + cascade delete on logout | `Session` model |

---

## Role-Based Access Control

| Role | Permissions |
|---|---|
| `Admin` | Full access to all routes including `PUT /admin/config` |
| `Accountant` | Review queues, migration approval, ERP monitoring |
| `Operator` | Dashboard overview, system health — read only |

Guards are implemented with NestJS `@UseGuards(JwtAuthGuard)` and `@Roles()` decorator applied at controller level.

---

## Input Validation

All DTOs use `class-validator` decorators. The global `ValidationPipe` in `main.ts` is configured with:
```typescript
new ValidationPipe({
  whitelist: true,              // Strip unknown fields
  forbidNonWhitelisted: true,  // Reject unknown fields
  transform: true,             // Auto-transform primitives
})
```

This prevents prototype pollution and payload injection attacks.

---

## File Upload Security

`UploadSecurityInterceptor` (`src/modules/files/guards/upload-security.interceptor.ts`):
- **MIME whitelist**: `application/pdf`, `image/jpeg`, `image/png`
- **Extension whitelist**: `.pdf`, `.jpg`, `.jpeg`, `.png`
- **Size cap**: 5MB per file
- **Filename sanitization**: `/[^a-zA-Z0-9.\-_]/g` regex normalization

---

## HTTP Security Headers

`helmet()` is applied globally in `main.ts`:
- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security (HSTS)
- Referrer-Policy

---

## CORS Configuration

```typescript
app.enableCors({
  origin: isProd ? process.env.FRONTEND_URL : 'http://localhost:3000',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
})
```

---

## Secrets Management

- All secrets managed via environment variables
- Never committed to version control (`.env` in `.gitignore`)
- `.env.production.example` contains only placeholder values
- No secrets in source code (verified by grep audit)
- Frontend receives ZERO sensitive keys — all cloud API keys remain server-side

---

## Rate Limiting

NestJS `@nestjs/throttler` can be configured via `ThrottlerModule` in `app.module.ts`. Default configuration should be tuned per deployment environment.

---

## Known Security Assumptions

1. **Tally Prime** communicates over HTTP on the internal network (port 9000). Ensure Tally is NOT exposed to the public internet.
2. **Redis** should be bound to localhost or an internal network only.
3. **PostgreSQL** should use TLS connections in production (`?sslmode=require` in DATABASE_URL).
4. **JWT_SECRET** must be at minimum 32 characters of cryptographic randomness.
5. This system does not implement multi-factor authentication (MFA). Consider adding for ADMIN accounts in production.
