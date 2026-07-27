# AUTHENTICATION VALIDATION REPORT

**Date:** 2026-07-24
**Phase:** 13 — Regression Audit

## 1. Login Flow Verification

**Audit of `POST /auth/login` (`AuthController` & `AuthService`)**

* **User lookup uses Prisma:** ✅ Verified. `this.prisma.user.findUnique({ where: { email } })` is used.
* **Password validation uses bcrypt:** ✅ Verified. `await bcrypt.compare(password, user.passwordHash)` is correctly implemented.
* **JWT is generated using configured secret:** ✅ Verified. Uses `this.configService.get('security')` to retrieve `jwtSecret` and `jwtExpiry`, and calls `this.jwtService.signAsync`.
* **Returned payload contains:**
  * user id: ✅ Verified (`sub: user.id`)
  * email: ✅ Verified
  * roles: ✅ Verified (`roles: [user.role.name]`)
  * permissions: ✅ Verified (mapped via `user.role.permissions.map(p => p.action)`)
* **Session record is created:** ✅ Verified. `this.prisma.session.create({ data: { userId, refreshToken, expiresAt } })` persists the session.

## 2. Test Scenarios (Static Trace)

* **Invalid email/password → 401:** ✅ Verified. `if (!user || !isPasswordValid) throw new UnauthorizedException('Invalid credentials');`
* **Valid credentials → JWT returned:** ✅ Verified. Returns `{ accessToken, user }`.
* **Inactive user → rejected:** ✅ Verified. `if (!user.isActive) throw new UnauthorizedException('User account is inactive');`

**Status:** ✅ **VERIFIED**
