import { CorrelationMiddleware } from './index';
import { CorrelationIdProvider, CorrelationContext } from '../context';

describe('CorrelationMiddleware', () => {
  let middleware: CorrelationMiddleware;
  let provider: jest.Mocked<CorrelationIdProvider>;

  beforeEach(() => {
    provider = {
      generate: jest.fn(),
    } as any;
    middleware = new CorrelationMiddleware(provider);
  });

  it('should use existing correlation id and run in context', (done) => {
    const req = {
      header: jest.fn().mockImplementation((key) => {
        if (key === 'x-correlation-id') return 'existing-id';
        if (key === 'x-tenant-id') return 'tenant-1';
        return null;
      }),
    } as any;
    
    const res = {
      setHeader: jest.fn(),
    } as any;
    
    const next = jest.fn(() => {
      const context = CorrelationContext.get();
      expect(context?.correlationId).toBe('existing-id');
      expect(context?.tenantId).toBe('tenant-1');
      expect(context?.requestId).toBeDefined();
      done();
    });

    middleware.use(req, res, next);
    
    expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', 'existing-id');
    expect(next).toHaveBeenCalled();
  });

  it('should generate new correlation id if none exists', (done) => {
    provider.generate.mockReturnValue('new-id');
    
    const req = {
      header: jest.fn().mockReturnValue(null),
    } as any;
    
    const res = {
      setHeader: jest.fn(),
    } as any;
    
    const next = jest.fn(() => {
      const context = CorrelationContext.get();
      expect(context?.correlationId).toBe('new-id');
      expect(context?.tenantId).toBe('DEFAULT');
      done();
    });

    middleware.use(req, res, next);
    
    expect(provider.generate).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', 'new-id');
  });
});
