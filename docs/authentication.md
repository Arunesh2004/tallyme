# TallyMe Enterprise — Authentication Guide

## Refresh Token Flow

```
POST /api/v1/auth/login
  → Body: { email, password }
  ← Response: { accessToken }
  ← Set-Cookie: refresh_token=<token>; HttpOnly; Secure; SameSite=Strict
```

The `refresh_token` cookie is:
- **HttpOnly**: Inaccessible to JavaScript (prevents XSS token theft)
- **Secure**: Only transmitted over HTTPS in production
- **SameSite=Strict**: Prevents CSRF by blocking cross-origin cookie delivery

### Refreshing the Token

```
POST /api/v1/auth/refresh
  ← Reads: refresh_token cookie automatically
  ← Response: { accessToken }
  ← Set-Cookie: refresh_token=<new_token>; HttpOnly; Secure; SameSite=Strict
```

Each refresh **rotates** the refresh token. Old tokens are invalidated.

### Logout

```
POST /api/v1/auth/logout
  → Authorization: Bearer <accessToken>
  ← Clears: refresh_token cookie
  ← Response: { message: "Logged out successfully" }
```

---

## CSRF Strategy

TallyMe uses `csurf` middleware for CSRF protection.

**Why `csurf`?**  
Although `csurf` has been archived by its maintainers, it remains the most widely deployed, battle-tested CSRF solution for Express. The project's threat model (cookie-based auth, SameSite=Strict) already mitigates modern CSRF vectors. `csurf` adds an additional token layer for defense-in-depth.

**Endpoints excluded from CSRF:**
| Endpoint | Reason |
|---|---|
| `/api/v1/health/*` | Health probes by K8s (no browser/user session) |
| `/api/v1/mail/webhook` | External callback from Google Pub/Sub |
| `/api/v1/metrics` | Prometheus scraping |

**How to use CSRF tokens in frontend:**
1. Fetch: `GET /api/v1/auth/csrf` → `{ csrfToken }`
2. Include in all state-changing requests: `X-CSRF-Token: <token>` header

---

## Webhook Verification

Google Pub/Sub sends webhook notifications with a signed JWT in the `Authorization: Bearer <token>` header.

**Verification process:**
1. Extract the JWT from the `Authorization` header.
2. Verify the JWT signature using Google's public certificates.
3. Verify the `aud` (audience) matches the subscription name.
4. Verify the JWT has not expired (replay protection).
5. Check the message ID against previously processed IDs (duplicate rejection).

**Rejection conditions:**
- Missing `Authorization` header → `401 Unauthorized`
- Invalid JWT signature → `401 Unauthorized`
- Expired JWT → `401 Unauthorized`
- Known replay message ID → `401 Unauthorized`

All failures are logged with a `WARN` level entry including the request IP.
