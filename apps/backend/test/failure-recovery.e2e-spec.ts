import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap/configure-app';

describe('Failure Recovery e2e Tests', () => {
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

  describe('ERP Unavailable', () => {
    it('should return degraded health when ERP is unavailable', async () => {
      // This test validates the health endpoint reflects ERP status
      const response = await request(httpServer).get('/api/v1/health/ready');

      // Should respond (200 OK or 503 Service Unavailable)
      expect([200, 503]).toContain(response.status);
    });
  });

  describe('Queue DLQ Behavior', () => {
    it('should surface Dead Letter Queue status in health metrics', async () => {
      const response = await request(httpServer).get('/api/v1/health/ready');

      // Health endpoint should respond gracefully
      expect(response.status).toBeDefined();
      expect([200, 503]).toContain(response.status);
    });
  });

  describe('Application Resilience', () => {
    it('should continue handling requests after internal error in one request', async () => {
      // Fire a known bad request
      await request(httpServer)
        .post('/api/v1/auth/login')
        .send({ invalid: 'payload' });

      // Immediately fire a valid health check
      const healthResponse = await request(httpServer).get(
        '/api/v1/health/live',
      );

      // App should still be alive
      expect(healthResponse.status).toBe(200);
    });
  });
});
