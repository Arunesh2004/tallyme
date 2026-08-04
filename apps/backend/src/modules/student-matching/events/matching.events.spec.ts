import {
  StudentMatchedEvent,
  StudentMatchFailedEvent,
  ManualReviewRequiredEvent,
  MultipleStudentsMatchedEvent,
  MatchingCompletedEvent,
} from './matching.events';

describe('Student Matching Events', () => {
  it('should instantiate StudentMatchedEvent', () => {
    const e = new StudentMatchedEvent('c-1', 's-1');
    expect(e.candidateId).toBe('c-1');
    expect(e.studentId).toBe('s-1');
  });

  it('should instantiate StudentMatchFailedEvent', () => {
    const e = new StudentMatchFailedEvent('c-1');
    expect(e.candidateId).toBe('c-1');
  });

  it('should instantiate ManualReviewRequiredEvent', () => {
    const e = new ManualReviewRequiredEvent('c-1');
    expect(e.candidateId).toBe('c-1');
  });

  it('should instantiate MultipleStudentsMatchedEvent', () => {
    const e = new MultipleStudentsMatchedEvent('c-1', ['s-1', 's-2']);
    expect(e.candidateId).toBe('c-1');
    expect(e.studentIds).toEqual(['s-1', 's-2']);
  });

  it('should instantiate MatchingCompletedEvent', () => {
    const e = new MatchingCompletedEvent('c-1');
    expect(e.candidateId).toBe('c-1');
  });
});
