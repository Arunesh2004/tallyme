import { VoucherCandidateCreatedEvent, VoucherValidationCompletedEvent, VoucherRejectedEvent, ManualReviewCreatedEvent, VoucherReadyForSyncEvent } from './voucher.events';

describe('VoucherEvents', () => {
  it('should instantiate VoucherCandidateCreatedEvent', () => {
    const e = new VoucherCandidateCreatedEvent('1');
    expect(e.candidateId).toBe('1');
  });

  it('should instantiate VoucherValidationCompletedEvent', () => {
    const e = new VoucherValidationCompletedEvent('1');
    expect(e.candidateId).toBe('1');
  });

  it('should instantiate VoucherRejectedEvent', () => {
    const e = new VoucherRejectedEvent('1', 'reason');
    expect(e.candidateId).toBe('1');
    expect(e.reason).toBe('reason');
  });

  it('should instantiate ManualReviewCreatedEvent', () => {
    const e = new ManualReviewCreatedEvent('1', 'reason');
    expect(e.candidateId).toBe('1');
    expect(e.reason).toBe('reason');
  });

  it('should instantiate VoucherReadyForSyncEvent', () => {
    const e = new VoucherReadyForSyncEvent('1');
    expect(e.candidateId).toBe('1');
  });
});
