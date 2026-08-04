jest.mock('bullmq', () => ({
  Queue: class {
    on() {}
  },
  Worker: class {
    on() {}
  },
}));

import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  Controller,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthModule } from '../src/modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { configureApp } from '../src/bootstrap/configure-app';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { TenantGuard } from '../src/infrastructure/guards/tenant.guard';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { LoggerService } from '../src/core/logger/logger.service';

@Controller('test-tenant')
class TestTenantController {
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get('resource')
  getResource(@Req() req: any) {
    // If the request makes it here, TenantGuard passed.
    // We expect tenantContext to be populated from the JWT and DB, NOT spoofed headers.
    return req.tenantContext;
  }
}

describe('Auth e2e Tests', () => {
  let app: INestApplication;
  let httpServer: any;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let testUser: any;
  let testOrg: any;
  let otherOrg: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
      providers: [
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
      controllers: [TestTenantController],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    httpServer = app.getHttpServer();
    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    const passwordHash = await bcrypt.hash('SecurePassword123!', 10);

    testOrg = await prisma.organization.create({
      data: { name: 'Test Org', slug: 'test-org-' + Date.now() },
    });

    otherOrg = await prisma.organization.create({
      data: { name: 'Other Org', slug: 'other-org-' + Date.now() },
    });

    testUser = await prisma.userAccount.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
        passwordHash,
        status: 'ACTIVE',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: testUser.id,
        organizationId: testOrg.id,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    await prisma.organizationMember.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.userAccount.delete({ where: { id: testUser.id } });
    await prisma.organization.delete({ where: { id: testOrg.id } });
    await prisma.organization.delete({ where: { id: otherOrg.id } });
    await app.close();
  });

  let validAccessToken: string;

  describe('Login & Password Validation', () => {
    it('TEST 1: Valid credentials - Expected 200, Signed JWT returned', async () => {
      const res = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'SecurePassword123!' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      validAccessToken = res.body.accessToken;
    });

    it('TEST 2: Wrong password - Expected 401, failedAttempts increments', async () => {
      const res = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword!' });

      expect(res.status).toBe(401);

      const user = await prisma.userAccount.findUnique({
        where: { id: testUser.id },
      });
      expect(user?.failedAttempts).toBeGreaterThan(0);
    });

    it('TEST 3: Repeated failures - Expected Account locks after configured threshold', async () => {
      for (let i = 0; i < 4; i++) {
        await request(httpServer)
          .post('/api/v1/auth/login')
          .send({ email: testUser.email, password: 'WrongPassword!' });
      }

      const res = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'SecurePassword123!' });

      expect(res.status).toBe(401);

      const user = await prisma.userAccount.findUnique({
        where: { id: testUser.id },
      });
      expect(user?.status).toBe('LOCKED');

      await prisma.userAccount.update({
        where: { id: testUser.id },
        data: { status: 'ACTIVE', failedAttempts: 0 },
      });
    });
  });

  describe('JWT & Tenant Security Validation', () => {
    it('TEST 4: Invalid JWT - Expected 401', async () => {
      const res = await request(httpServer)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer invalid-token.abc.123');

      expect(res.status).toBe(401);
    });

    it('TEST 5: Modified JWT payload - Expected Rejected', async () => {
      const forgedToken =
        validAccessToken.substring(0, validAccessToken.length - 5) + 'xxxxx';
      const res = await request(httpServer)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
    });

    it('TEST 6: Cross tenant access & TEST 7: Spoofed headers', async () => {
      const res = await request(httpServer)
        .get('/api/v1/test-tenant/resource')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .set('x-user-id', 'spoofed-user-id')
        .set('x-organization-id', otherOrg.id); // trying to access otherOrg

      expect(res.status).toBe(200); // Wait, my tenant guard extracts from JWT and ignores headers.
      // Thus it should successfully authorize them for `testOrg.id`, IGNORING `otherOrg.id`.
      expect(res.body.organizationId).toBe(testOrg.id); // It should return the REAL org, not spoofed
      expect(res.body.organizationId).not.toBe(otherOrg.id);
    });

    it('Cross tenant logic directly - if JWT contains Org B but user is not member -> 403', async () => {
      // Forge a JWT manually signed with the real secret (like a compromised service might)
      const payload = {
        sub: testUser.id,
        email: testUser.email,
        organizationId: otherOrg.id, // User is NOT a member of otherOrg
        role: 'SUPER_ADMIN',
      };
      const signedForged = await jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION',
      });

      const res = await request(httpServer)
        .get('/api/v1/test-tenant/resource')
        .set('Authorization', `Bearer ${signedForged}`);

      expect(res.status).toBe(403);
    });
  });
});
