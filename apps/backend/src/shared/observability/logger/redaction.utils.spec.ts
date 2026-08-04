import { LogRedactor, LoggingInterceptor } from './redaction.utils';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { ILogger } from './index';

describe('LogRedactor', () => {
  it('should redact string messages', () => {
    const msg = 'User login password: "supersecretpassword"';
    const redacted = LogRedactor.redact(msg);
    expect(redacted).toBe('User login password: "***REDACTED***"');
  });

  it('should redact object messages', () => {
    const msg = {
      username: 'admin',
      token: '12345-abcde',
    };
    const redacted = LogRedactor.redact(msg);
    expect(redacted).toContain('token: "***REDACTED***"');
    expect(redacted).toContain('username":"admin"');
  });

  it('should redact GSTINs', () => {
    const msg = 'Invoice from 22AAAAA0000A1Z5';
    const redacted = LogRedactor.redact(msg);
    expect(redacted).toContain('***GSTIN_REDACTED***');
  });
});

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logger: jest.Mocked<ILogger>;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;
    interceptor = new LoggingInterceptor(logger);
  });

  it('should intercept and log request/response', (done) => {
    const mockRequest = {
      method: 'POST',
      url: '/test',
      body: { password: 'secretpassword' },
    };
    
    const executionContext: Partial<ExecutionContext> = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
      }),
    };

    const callHandler: Partial<CallHandler> = {
      handle: jest.fn().mockReturnValue(of('response')),
    };

    interceptor.intercept(executionContext as ExecutionContext, callHandler as CallHandler).subscribe({
      complete: () => {
        expect(logger.info).toHaveBeenCalledWith('Incoming Request', {
          method: 'POST',
          url: '/test',
          body: '{"password: "***REDACTED***"}',
        });
        
        expect(logger.info).toHaveBeenCalledWith('Outgoing Response', expect.objectContaining({
          method: 'POST',
          url: '/test',
          duration: expect.any(Number),
        }));
        
        done();
      },
    });
  });
});
