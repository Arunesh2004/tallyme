import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap/configure-app';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('Concurrency e2e Tests', () => {
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

  describe('Duplicate Email Processing', () => {
    it('should not process the same emailId twice concurrently', async () => {
      const emailId = `test-email-${Date.now()}`;

      // Fire 5 parallel requests with the same emailId
      const concurrentRequests = Array.from({ length: 5 }, () =>
        request(httpServer)
          .post('/api/v1/mail/parse')
          .send({ emailId })
          .catch((err) => ({ status: 500, error: err.message })),
      );

      const responses = await Promise.all(concurrentRequests);

      // Count successful (2xx) vs failed (4xx/5xx) responses
      const successes = responses.filter(
        (r) => (r as any).status >= 200 && (r as any).status < 300,
      );

      // Only 1 should succeed (idempotency), or all may fail gracefully
      expect(successes.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Parallel Queue Workers', () => {
    it('should expose queue health without crashing under parallel access', async () => {
      const parallelRequests = Array.from({ length: 10 }, () =>
        request(httpServer).get('/api/v1/health/ready'),
      );

      const responses = await Promise.all(parallelRequests);
      responses.forEach((r) => {
        // All should respond (200 or 503 depending on health)
        expect([200, 503]).toContain(r.status);
      });
    });
  });
});
