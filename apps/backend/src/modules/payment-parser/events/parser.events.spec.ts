import {
  GatewayDetectedEvent,
  PaymentCandidateCreatedEvent,
  LowConfidenceDetectedEvent,
  DuplicateCandidateDetectedEvent,
  ParserFailedEvent,
} from './parser.events';

describe('Parser Events', () => {
  it('should instantiate GatewayDetectedEvent', () => {
    const e = new GatewayDetectedEvent('email-1', 'CASHFREE');
    expect(e.emailId).toBe('email-1');
    expect(e.gateway).toBe('CASHFREE');
  });

  it('should instantiate PaymentCandidateCreatedEvent', () => {
    const e = new PaymentCandidateCreatedEvent('cand-1');
    expect(e.candidateId).toBe('cand-1');
  });

  it('should instantiate LowConfidenceDetectedEvent', () => {
    const e = new LowConfidenceDetectedEvent('cand-1', 0.45);
    expect(e.candidateId).toBe('cand-1');
    expect(e.confidence).toBe(0.45);
  });

  it('should instantiate DuplicateCandidateDetectedEvent', () => {
    const e = new DuplicateCandidateDetectedEvent('cand-1');
    expect(e.candidateId).toBe('cand-1');
  });

  it('should instantiate ParserFailedEvent', () => {
    const e = new ParserFailedEvent('email-1', 'Invalid format');
    expect(e.emailId).toBe('email-1');
    expect(e.error).toBe('Invalid format');
  });
});
