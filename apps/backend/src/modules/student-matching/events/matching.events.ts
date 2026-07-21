export class StudentMatchedEvent {
  constructor(
    public readonly candidateId: string,
    public readonly studentId: string,
  ) {}
}

export class StudentMatchFailedEvent {
  constructor(public readonly candidateId: string) {}
}

export class ManualReviewRequiredEvent {
  constructor(public readonly candidateId: string) {}
}

export class MultipleStudentsMatchedEvent {
  constructor(
    public readonly candidateId: string,
    public readonly studentIds: string[],
  ) {}
}

export class MatchingCompletedEvent {
  constructor(public readonly candidateId: string) {}
}
