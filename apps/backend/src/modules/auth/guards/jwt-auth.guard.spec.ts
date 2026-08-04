import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoggerService } from '../../../core/logger/logger.service';
import {
  UnauthenticatedException,
  ExpiredTokenException,
} from '../exceptions/auth.exceptions';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    logger = {
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    } as any;

    guard = new JwtAuthGuard(reflector, logger);
  });

  describe('canActivate', () => {
    it('should return true if public route', () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context: any = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
      };
      
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should delegate to super if not public', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context: any = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({ getRequest: () => ({}) }),
      };
      
      // Since super.canActivate calls passport under the hood which is complex to mock, 
      // we'll just mock the prototype for testing this path.
      const spy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      spy.mockReturnValue(true);

      const result = guard.canActivate(context);
      expect(result).toBe(true);
      
      spy.mockRestore();
    });
  });

  describe('handleRequest', () => {
    it('should return user if authentication succeeds', () => {
      const user = { id: 'u1' };
      const result = guard.handleRequest(null, user, null);
      expect(result).toBe(user);
    });

    it('should throw ExpiredTokenException if token is expired', () => {
      const info = { name: 'TokenExpiredError' };
      expect(() => guard.handleRequest(null, null, info)).toThrow(ExpiredTokenException);
      expect(logger.warn).toHaveBeenCalledWith('Authentication failed: Expired token', 'JwtAuthGuard');
    });

    it('should throw original error if present', () => {
      const error = new Error('Custom error');
      expect(() => guard.handleRequest(error, null, null)).toThrow(error);
      expect(logger.warn).toHaveBeenCalledWith('Authentication failed: Custom error', 'JwtAuthGuard');
    });

    it('should throw UnauthenticatedException if neither user nor err is present', () => {
      const info = { message: 'No auth' };
      expect(() => guard.handleRequest(null, null, info)).toThrow(UnauthenticatedException);
      expect(logger.warn).toHaveBeenCalledWith('Authentication failed: No auth', 'JwtAuthGuard');
    });
  });
});
