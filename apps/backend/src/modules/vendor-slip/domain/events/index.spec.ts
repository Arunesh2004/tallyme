import {
  InvoiceUploaded,
  OCRCompleted,
  InvoiceExtracted,
  VendorMatched,
  ExpenseAllocated,
  VoucherGenerated,
} from './index';

const metadata = {
  eventId: 'e-1',
  eventType: 'test',
  occurredAt: new Date(),
  aggregateId: 'agg-1',
  aggregateType: 'VendorSlip',
  aggregateVersion: 1,
  correlationId: 'corr-1',
  tenantId: 'tenant-1',
  eventVersion: 1,
  producer: 'test',
  version: 1,
};

describe('Vendor Slip Domain Events', () => {
  it('should instantiate InvoiceUploaded', () => {
    const e = new InvoiceUploaded(metadata, { invoiceId: 'inv-1' });
    expect(e._isDomainEvent).toBe(true);
    expect(e.payload.invoiceId).toBe('inv-1');
  });

  it('should instantiate OCRCompleted', () => {
    const e = new OCRCompleted(metadata, { text: 'parsed' });
    expect(e._isDomainEvent).toBe(true);
    expect(e.payload.text).toBe('parsed');
  });

  it('should instantiate InvoiceExtracted', () => {
    const e = new InvoiceExtracted(metadata, { amount: 100 });
    expect(e._isDomainEvent).toBe(true);
    expect(e.payload.amount).toBe(100);
  });

  it('should instantiate VendorMatched', () => {
    const e = new VendorMatched(metadata, { vendorId: 'v-1' });
    expect(e._isDomainEvent).toBe(true);
    expect(e.payload.vendorId).toBe('v-1');
  });

  it('should instantiate ExpenseAllocated', () => {
    const e = new ExpenseAllocated(metadata, { ledger: 'Office Expenses' });
    expect(e._isDomainEvent).toBe(true);
    expect(e.payload.ledger).toBe('Office Expenses');
  });

  it('should instantiate VoucherGenerated as integration event', () => {
    const e = new VoucherGenerated(metadata, { voucherId: 'v-1' });
    expect(e._isIntegrationEvent).toBe(true);
    expect(e._isDomainEvent).toBe(false);
    expect(e.payload.voucherId).toBe('v-1');
  });
});
