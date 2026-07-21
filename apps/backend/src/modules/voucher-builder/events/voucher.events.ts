export class VoucherCandidateCreatedEvent {
  constructor(public readonly candidateId: string) {}
}

export class VoucherValidationCompletedEvent {
  constructor(public readonly candidateId: string) {}
}

export class VoucherRejectedEvent {
  constructor(
    public readonly candidateId: string,
    public readonly reason: string,
  ) {}
}

export class ManualReviewCreatedEvent {
  constructor(
    public readonly candidateId: string,
    public readonly reason: string,
  ) {}
}

export class VoucherReadyForSyncEvent {
  constructor(public readonly candidateId: string) {}
}
