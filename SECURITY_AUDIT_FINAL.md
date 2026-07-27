# Security Audit — Final

**Audit Method**: Direct code inspection. Previous security reports not trusted.

---

## 1. Authentication — CRITICAL FAILURE

🔴 **CRITICAL: `auth.controller.ts` lines 44–45 return `STUB_ACCESS_TOKEN` and `STUB_REFRESH_TOKEN` as literal strings.** The `authService.login()` call is COMMENTED OUT.

```typescript
// In a real implementation this would call:
// const tokens = await this.authService.login(loginDto);
const accessToken = 'STUB_ACCESS_TOKEN';
const refreshToken = 'STUB_REFRESH_TOKEN';
```

**This means authentication is completely non-functional in production.** Any call to `POST /auth/login` will return `STUB_ACCESS_TOKEN` regardless of credentials. The JWT strategy then cannot validate this token because it is not a real signed JWT.

🔴 **CRITICAL: `POST /auth/refresh` also returns stub tokens.** Token rotation is non-functional.

---

## 2. Authorization — PARTIAL FAILURE

⚠️ The global `APP_GUARD` is only `ThrottlerGuard` (app.module.ts line 85–87). **There is no global JWT guard.**

🔴 **`OcrController` (ocr.controller.ts) has no `@UseGuards` decorator at the class level.** It uses `@RequirePermissions` but `PermissionsGuard` is never activated since `JwtAuthGuard` is not applied. Anyone can call `POST /ocr/process/:fileId` without a token.

🔴 **`ReviewController` (review.controller.ts) has no `@UseGuards` decorator.** The `approve` and `review` endpoints are unauthenticated.

✅ `ManualReviewController` has `@UseGuards(JwtAuthGuard, PermissionsGuard)` at class level — correct.
✅ `FilesController` has `@UseGuards(JwtAuthGuard, PermissionsGuard)` — correct.
✅ `StudentManualReviewController` has guards — correct.

---

## 3. Secrets Management — VERIFIED

✅ No hardcoded API keys found in source code.
✅ `.env` is gitignored.
✅ `NEXT_PUBLIC_*` variables contain zero secrets.

---

## 4. Upload Security — FINDING

⚠️ `FilesController` (files.controller.ts line 29) sets `MAX_SIZE = 10 * 1024 * 1024` (10MB). The previously documented value was 5MB. **Documentation is incorrect.**

⚠️ The file persistence call (line 53–54) is **commented out** (`// await this.prisma.fileMetadata.create(...)`). Uploaded files are stored to local disk by `LocalStorageProvider` but **never tracked in the database.** There is no way to retrieve, audit, or associate uploaded files with documents.

---

## 5. Input Validation — VERIFIED

✅ Global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true` in `main.ts`.
✅ `helmet()` applied.
✅ CORS configured environment-appropriately.

---

## 6. CSRF

⚠️ `GET /auth/csrf` exists and calls `req.csrfToken()` but the `csurf` middleware is not mounted in `main.ts`. This endpoint will throw a runtime error on first call.

---

## Summary

| Control | Status |
|---|---|
| Authentication (login) | 🔴 BROKEN — stub tokens, authService.login commented out |
| Token refresh | 🔴 BROKEN — stub tokens |
| OcrController auth guard | 🔴 MISSING |
| ReviewController auth guard | 🔴 MISSING |
| File persistence | 🔴 NOT IMPLEMENTED (commented out) |
| Upload size limit | ⚠️ 10MB in code, 5MB in docs |
| CSRF endpoint | ⚠️ Middleware not mounted |
| Input validation | 🟢 VERIFIED |
| Security headers | 🟢 VERIFIED |
| Secrets management | 🟢 VERIFIED |
