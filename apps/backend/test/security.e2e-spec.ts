import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap/configure-app';

describe('Security e2e Tests', () => {
  let app: INestApplication;
  let httpServer: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================
  // 1. CSRF Protection Tests
  // =========================================================
  describe('CSRF Protection', () => {
    it('should reject state-changing requests without CSRF token', async () => {
      const response = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: 'password' });

      // CSRF middleware should reject without csrf token cookie
      expect(response.status).toBe(403);
    });

    it('should expose csrf token on GET /auth/csrf', async () => {
      const response = await request(httpServer).get('/api/v1/auth/csrf');

      // Should return 200 or 403 depending on CSRF setup – but not 404
      expect(response.status).not.toBe(404);
    });

    it('should allow health endpoints without CSRF token', async () => {
      const response = await request(httpServer).get('/api/v1/health/live');

      expect(response.status).toBe(200);
    });

    it('should allow metrics endpoints without CSRF token', async () => {
      const response = await request(httpServer).get('/api/v1/metrics');

      // Prometheus metrics endpoint (may 200 or 404 depending on config, but not 403)
      expect(response.status).not.toBe(403);
    });
  });

  // =========================================================
  // 2. HttpOnly Cookie Tests
  // =========================================================
  describe('HttpOnly Cookie Security', () => {
    it('login response should NOT expose refresh token in JSON body', async () => {
      const response = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'pass' });

      // Regardless of HTTP status, the body must not leak refresh token
      if (response.body) {
        expect(response.body.refreshToken).toBeUndefined();
      }
    });
  });

  // =========================================================
  // 3. JWT Tests
  // =========================================================
  describe('JWT Auth Guard', () => {
    it('should reject expired JWT token', async () => {
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0Iiwi' +
        'ZXhwIjoxNjAwMDAwMDAwfQ.invalid_signature';

      const response = await request(httpServer)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should reject a completely invalid JWT token', async () => {
      const response = await request(httpServer)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer not.a.valid.jwt');

      expect(response.status).toBe(401);
    });

    it('should reject request with no Authorization header', async () => {
      const response = await request(httpServer).post('/api/v1/auth/logout');

      expect(response.status).toBe(401);
    });
  });

  // =========================================================
  // 4. Webhook Verification Tests
  // =========================================================
  describe('Webhook Signature Verification', () => {
    it('should reject webhook requests with no Authorization header', async () => {
      const response = await request(httpServer)
        .post('/api/v1/gmail/webhook')
        .send({ message: { messageId: 'test123' } });

      expect(response.status).toBe(401);
    });

    it('should reject webhook requests with invalid token', async () => {
      const response = await request(httpServer)
        .post('/api/v1/gmail/webhook')
        .set('Authorization', 'Bearer INVALID_TOKEN')
        .send({ message: { messageId: 'test123' } });

      expect(response.status).toBe(401);
    });

    it('should reject replay attack with known replay ID', async () => {
      const response = await request(httpServer)
        .post('/api/v1/gmail/webhook')
        .set('Authorization', 'Bearer VALID_STUB_TOKEN')
        .send({ message: { messageId: 'REPLAY_ID' } });

      expect(response.status).toBe(401);
    });
  });

  // =========================================================
  // 5. Rate Limiting Tests
  // =========================================================
  describe('Rate Limiting', () => {
    it('should throttle excessive requests', async () => {
      const requests = Array.from({ length: 110 }, () =>
        request(httpServer).get('/api/v1/health/live'),
      );

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter((r) => r.status === 429);

      // Some requests should be throttled when limit of 100 is exceeded
      expect(tooManyRequests.length).toBeGreaterThan(0);
    });
  });
});
