import { Test, TestingModule } from '@nestjs/testing';
import { AuthController, LoginDto, BootstrapDto } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { Reflector } from '@nestjs/core';
import { LoggerService } from '../../core/logger/logger.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      bootstrap: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
        { provide: LoggerService, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn() } },
        JwtAuthGuard
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('getCsrfToken', () => {
    it('should return csrf token if available', () => {
      const req: any = { csrfToken: () => 'my-csrf' };
      const res = controller.getCsrfToken(req);
      expect(res).toEqual({ csrfToken: 'my-csrf' });
    });

    it('should return fallback if not enabled', () => {
      const req: any = {};
      const res = controller.getCsrfToken(req);
      expect(res).toEqual({ csrfToken: 'csrf-not-enabled' });
    });
  });

  describe('login', () => {
    it('should set refresh token cookie and return access token', async () => {
      const dto: LoginDto = { email: 'test@test.com', password: 'password123' };
      const req: any = {};
      const res: any = { cookie: jest.fn() };
      
      authService.login.mockResolvedValueOnce({
        accessToken: 'access123',
        refreshToken: 'refresh123',
        user: { id: 'u1' } as any,
      });

      const result = await controller.login(dto, req, res);

      expect(authService.login).toHaveBeenCalledWith('test@test.com', 'password123');
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'refresh123', expect.any(Object));
      expect(result).toEqual({ accessToken: 'access123', user: { id: 'u1' } });
    });
  });

  describe('bootstrap', () => {
    it('should delegate to authService', async () => {
      const dto: BootstrapDto = {
        email: 'test@test.com',
        password: 'password123',
        organizationName: 'Org',
        companyName: 'Comp',
      };
      
      authService.bootstrap.mockResolvedValueOnce({ id: 'org1' } as any);

      const result = await controller.bootstrap(dto);
      expect(authService.bootstrap).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 'org1' });
    });
  });

  describe('refresh', () => {
    it('should throw if refresh token is missing', async () => {
      const req: any = { cookies: {} };
      const res: any = {};
      
      await expect(controller.refresh(req, res)).rejects.toThrow(UnauthorizedException);
    });

    it('should refresh and set new cookie', async () => {
      const req: any = { cookies: { refresh_token: 'old-refresh' } };
      const res: any = { cookie: jest.fn() };
      
      authService.refresh.mockResolvedValueOnce({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        user: { id: 'u1' } as any,
      });

      const result = await controller.refresh(req, res);
      
      expect(authService.refresh).toHaveBeenCalledWith('old-refresh');
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'new-refresh', expect.any(Object));
      expect(result).toEqual({ accessToken: 'new-access', user: { id: 'u1' } });
    });
  });

  describe('logout', () => {
    it('should clear cookie and delegate to authService', async () => {
      const req: any = { user: { id: 'u1' }, cookies: { refresh_token: 'refresh-token' } };
      const res: any = { clearCookie: jest.fn() };
      
      authService.logout.mockResolvedValueOnce();

      const result = await controller.logout(req, res);
      
      expect(authService.logout).toHaveBeenCalledWith('u1', 'refresh-token');
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
