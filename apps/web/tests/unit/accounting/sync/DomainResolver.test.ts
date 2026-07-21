import { describe, it, expect } from 'vitest';
import { DomainResolver } from '../../../../modules/accounting/sync/resolvers/DomainResolver';
import { VoucherSyncHandler } from '../../../../modules/accounting/sync/resolvers/VoucherSyncHandler';

describe('DomainResolver', () => {
  it('should resolve registered handlers correctly', () => {
    const resolver = new DomainResolver();
    const handler = resolver.resolve('Voucher');

    expect(handler).toBeInstanceOf(VoucherSyncHandler);
    expect(handler.aggregateType).toBe('Voucher');
  });

  it('should throw error for unregistered aggregate types', () => {
    const resolver = new DomainResolver();
    
    expect(() => resolver.resolve('UnknownAggregate')).toThrowError('No SyncHandler registered for aggregate type: UnknownAggregate');
  });
});
