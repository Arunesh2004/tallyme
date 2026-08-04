import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BcryptPasswordHasher } from '../providers/bcrypt-password.hasher';
import { JwtTokenProvider } from '../providers/jwt-token.provider';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  
  const mockPrisma = {
    userAccount: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    }
  };

  const mockHasher = {
    compare: jest.fn(),
  };

  const mockTokenProvider = {
    signToken: jest.fn().mockResolvedValue('fake_jwt_token'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BcryptPasswordHasher, useValue: mockHasher },
        { provide: JwtTokenProvider, useValue: mockTokenProvider },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue(null);
      await expect(service.login('test@test.com', 'pass', 'dev', '127.0.0.1'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user inactive', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({ status: 'INACTIVE' });
      await expect(service.login('test@test.com', 'pass', 'dev', '127.0.0.1'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user locked', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({ status: 'ACTIVE', failedAttempts: 5, id: 'u1' });
      mockPrisma.userAccount.update.mockResolvedValue({});
      await expect(service.login('test@test.com', 'pass', 'dev', '127.0.0.1'))
        .rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.userAccount.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'LOCKED' } }));
    });

    it('should throw UnauthorizedException if password invalid', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({ status: 'ACTIVE', failedAttempts: 0, id: 'u1' });
      mockHasher.compare.mockResolvedValue(false);
      mockPrisma.userAccount.update.mockResolvedValue({});
      await expect(service.login('test@test.com', 'pass', 'dev', '127.0.0.1'))
        .rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.userAccount.update).toHaveBeenCalledWith(expect.objectContaining({ data: { failedAttempts: 1 } }));
    });

    it('should login successfully and return tokens', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({
        id: 'u1', email: 'test@test.com', name: 'Test', status: 'ACTIVE', failedAttempts: 0,
        memberships: [{ organizationId: 'org1', role: 'ADMIN' }]
      });
      mockHasher.compare.mockResolvedValue(true);
      mockPrisma.userAccount.update.mockResolvedValue({});
      mockPrisma.userSession.create.mockResolvedValue({});

      const result = await service.login('test@test.com', 'pass', 'dev', '127.0.0.1');
      expect(result.accessToken).toBe('fake_jwt_token');
      expect(result.refreshToken).toBeDefined();
      expect(mockTokenProvider.signToken).toHaveBeenCalledWith({
        sub: 'u1', email: 'test@test.com', organizationId: 'org1', role: 'ADMIN'
      });
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException if session missing', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue(null);
      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if session expired', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue({ id: 's1', expiresAt: new Date(Date.now() - 10000) });
      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.userSession.delete).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user inactive during refresh', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue({ id: 's1', userId: 'u1', expiresAt: new Date(Date.now() + 10000) });
      mockPrisma.userAccount.findUnique.mockResolvedValue({ status: 'INACTIVE' });
      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should refresh successfully', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue({ id: 's1', userId: 'u1', expiresAt: new Date(Date.now() + 10000) });
      mockPrisma.userAccount.findUnique.mockResolvedValue({
        id: 'u1', email: 'test@test.com', name: 'Test', status: 'ACTIVE',
        memberships: [{ organizationId: 'org1', role: 'ADMIN' }]
      });
      mockPrisma.userSession.update.mockResolvedValue({});
      
      const result = await service.refresh('token');
      expect(result.accessToken).toBe('fake_jwt_token');
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('logout', () => {
    it('should delete session', async () => {
      await service.logout('u1', 'token');
      expect(mockPrisma.userSession.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', refreshToken: 'token' } });
    });
  });
});
