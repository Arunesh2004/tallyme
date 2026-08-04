import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../core/logger/logger.service';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

jest.mock('bcrypt');

describe('Global AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockTx)),
  };

  const mockTx = {
    organization: { create: jest.fn() },
    company: { create: jest.fn() },
    role: { upsert: jest.fn() },
    user: { create: jest.fn() },
    roleAssignment: { create: jest.fn() },
  };

  const mockJwt = {
    signAsync: jest.fn().mockResolvedValue('mocked-access-token'),
  };

  const mockConfig = {
    get: jest.fn().mockReturnValue({
      jwtSecret: 'secret',
      jwtExpiry: '15m',
    }),
  };

  const mockLogger = {
    warn: jest.fn(),
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
  });

  describe('login', () => {
    const defaultUser = {
      id: 'usr1',
      email: 'test@example.com',
      isActive: true,
      passwordHash: 'hashedpassword',
      companyId: 'comp1',
      organizationId: 'org1',
      role: {
        name: 'ADMIN',
        permissions: [{ action: 'READ' }],
      },
    };

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login('test@example.com', 'pass')).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: 'LOGIN_FAILED', reason: 'Unknown or inactive user' })
      }));
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...defaultUser, isActive: false });

      await expect(service.login('test@example.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(defaultUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('test@example.com', 'wrong')).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: 'LOGIN_FAILED', reason: 'Invalid password' })
      }));
    });

    it('should throw UnauthorizedException if user has no companyId', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...defaultUser, companyId: null });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login('test@example.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens and user details on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(defaultUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('test@example.com', 'pass');
      expect(result.accessToken).toEqual('mocked-access-token');
      expect(typeof result.refreshToken).toBe('string');
      expect(mockJwt.signAsync).toHaveBeenCalled();
      expect(mockPrisma.session.create).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: 'LOGIN_SUCCESS' })
      }));
    });
  });

  describe('refresh', () => {
    const validSession = {
      id: 'sess1',
      refreshToken: 'old-token',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 100000),
      user: {
        id: 'usr1',
        email: 'test@example.com',
        isActive: true,
        companyId: 'comp1',
        role: {
          name: 'ADMIN',
          permissions: [{ action: 'READ' }],
        },
      },
    };

    it('should throw UnauthorizedException if token missing', async () => {
      await expect(service.refresh(null as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if session not found', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);
      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if session revoked', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ ...validSession, isRevoked: true });
      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if session expired', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ ...validSession, expiresAt: new Date(Date.now() - 10000) });
      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user account is inactive', async () => {
      const inactiveSession = JSON.parse(JSON.stringify(validSession));
      inactiveSession.expiresAt = new Date(Date.now() + 100000);
      inactiveSession.user.isActive = false;
      mockPrisma.session.findUnique.mockResolvedValue(inactiveSession);
      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should refresh tokens and revoke old session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(validSession);
      const result = await service.refresh('old-token');

      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'sess1' },
        data: { isRevoked: true },
      });
      expect(mockPrisma.session.create).toHaveBeenCalled();
      expect(result.accessToken).toEqual('mocked-access-token');
      expect(typeof result.refreshToken).toBe('string');
    });
  });

  describe('logout', () => {
    it('should update sessions to revoked', async () => {
      await service.logout('usr1', 'token');
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'usr1', refreshToken: 'token', isRevoked: false },
        data: { isRevoked: true },
      });
    });

    it('should ignore exceptions during logout', async () => {
      mockPrisma.session.updateMany.mockRejectedValue(new Error('DB Error'));
      await expect(service.logout('usr1', 'token')).resolves.not.toThrow();
    });
  });

  describe('bootstrap', () => {
    it('should throw ForbiddenException if system is already initialized', async () => {
      mockPrisma.user.count.mockResolvedValue(1);
      await expect(service.bootstrap({}) as any).rejects.toThrow(ForbiddenException);
    });

    it('should bootstrap the system successfully', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      
      mockTx.organization.create.mockResolvedValue({ id: 'org1' });
      mockTx.company.create.mockResolvedValue({ id: 'comp1' });
      mockTx.role.upsert.mockResolvedValue({ id: 'role1' });
      mockTx.user.create.mockResolvedValue({ id: 'user1' });

      const dto = {
        organizationName: 'Test Org',
        companyName: 'Test Co',
        email: 'admin@test.com',
        password: 'pass',
      };

      const result = await service.bootstrap(dto);
      expect(result.message).toEqual('Bootstrap successful');
      expect(mockTx.organization.create).toHaveBeenCalled();
      expect(mockTx.user.create).toHaveBeenCalled();
    });

    it('should throw error if transaction fails', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.$transaction.mockRejectedValue(new Error('Tx Failed'));
      await expect(service.bootstrap({}) as any).rejects.toThrow('Tx Failed');
    });
  });
});
