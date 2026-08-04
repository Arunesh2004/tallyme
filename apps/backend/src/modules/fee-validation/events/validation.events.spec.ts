import {
  FeeValidatedEvent,
  FeeAllocationCreatedEvent,
  ManualReviewCreatedEvent,
  DuplicatePaymentDetectedEvent,
} from './validation.events';

describe('FeeValidation Events', () => {
  it('should instantiate FeeValidatedEvent', () => {
    const e = new FeeValidatedEvent('c-1');
    expect(e.candidateId).toBe('c-1');
  });

  it('should instantiate FeeAllocationCreatedEvent', () => {
    const e = new FeeAllocationCreatedEvent('c-1');
    expect(e.candidateId).toBe('c-1');
  });

  it('should instantiate ManualReviewCreatedEvent', () => {
    const e = new ManualReviewCreatedEvent('c-1', 'OCR failed');
    expect(e.candidateId).toBe('c-1');
    expect(e.reason).toBe('OCR failed');
  });

  it('should instantiate DuplicatePaymentDetectedEvent', () => {
    const e = new DuplicatePaymentDetectedEvent('c-1');
    expect(e.candidateId).toBe('c-1');
  });
});
