import {
  VoucherSyncStartedEvent,
  VoucherSyncSucceededEvent,
  VoucherSyncFailedEvent,
  RetryScheduledEvent,
} from './erp.events';

describe('ERP Events', () => {
  it('should instantiate VoucherSyncStartedEvent', () => {
    const event = new VoucherSyncStartedEvent('cand-1');
    expect(event.voucherCandidateId).toBe('cand-1');
  });

  it('should instantiate VoucherSyncSucceededEvent', () => {
    const event = new VoucherSyncSucceededEvent('cand-1', 'ref-1');
    expect(event.voucherCandidateId).toBe('cand-1');
    expect(event.erpRef).toBe('ref-1');
  });

  it('should instantiate VoucherSyncFailedEvent', () => {
    const event = new VoucherSyncFailedEvent('cand-1', 'Network error');
    expect(event.voucherCandidateId).toBe('cand-1');
    expect(event.reason).toBe('Network error');
  });

  it('should instantiate RetryScheduledEvent', () => {
    const event = new RetryScheduledEvent('cand-1', 2);
    expect(event.voucherCandidateId).toBe('cand-1');
    expect(event.attempt).toBe(2);
  });
});
