import { CorrelationContext, CorrelationIdProvider, RequestContext } from './index';

describe('CorrelationContext', () => {
  it('should store and retrieve data', (done) => {
    const data = { correlationId: 'test-123', userId: 'user-1' };
    
    CorrelationContext.run(data, () => {
      const retrieved = CorrelationContext.get();
      expect(retrieved).toEqual(data);
      expect(CorrelationContext.getCorrelationId()).toBe('test-123');
      done();
    });
  });

  it('should return undefined if no context', () => {
    expect(CorrelationContext.get()).toBeUndefined();
    expect(CorrelationContext.getCorrelationId()).toBeUndefined();
  });
});

describe('CorrelationIdProvider', () => {
  it('should generate a UUID', () => {
    const provider = new CorrelationIdProvider();
    const id = provider.generate();
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
  });
});

describe('RequestContext', () => {
  it('should be an alias for CorrelationContext', () => {
    expect(RequestContext).toBe(CorrelationContext);
  });
});
