import {
  PaymentParsed,
  StudentMatched,
  FeeAllocated,
  VoucherGenerated,
} from './index';

const metadata = {
  eventId: 'e-1',
  eventType: 'test',
  occurredAt: new Date(),
  aggregateId: 'agg-1',
  aggregateType: 'StudentFee',
  aggregateVersion: 1,
  correlationId: 'corr-1',
  tenantId: 'tenant-1',
  eventVersion: 1,
  producer: 'test',
  version: 1,
};

describe('Student Fee Domain Events', () => {
  it('should instantiate PaymentParsed', () => {
    const e = new PaymentParsed(metadata, { amount: 5000 });
    expect(e._isDomainEvent).toBe(true);
    expect(e.payload.amount).toBe(5000);
  });

  it('should instantiate StudentMatched', () => {
    const e = new StudentMatched(metadata, { studentId: 's-1' });
    expect(e._isDomainEvent).toBe(true);
    expect(e.payload.studentId).toBe('s-1');
  });

  it('should instantiate FeeAllocated', () => {
    const e = new FeeAllocated(metadata, { feeId: 'f-1' });
    expect(e._isDomainEvent).toBe(true);
    expect(e.payload.feeId).toBe('f-1');
  });

  it('should instantiate VoucherGenerated as integration event', () => {
    const e = new VoucherGenerated(metadata, { voucherId: 'v-1' });
    expect(e._isIntegrationEvent).toBe(true);
    expect(e._isDomainEvent).toBe(false);
    expect(e.payload.voucherId).toBe('v-1');
  });
});
