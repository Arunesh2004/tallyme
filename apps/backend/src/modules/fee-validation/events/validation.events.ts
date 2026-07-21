export class FeeValidatedEvent {
  constructor(public readonly candidateId: string) {}
}

export class FeeAllocationCreatedEvent {
  constructor(public readonly candidateId: string) {}
}

export class ManualReviewCreatedEvent {
  constructor(
    public readonly candidateId: string,
    public readonly reason: string,
  ) {}
}

export class DuplicatePaymentDetectedEvent {
  constructor(public readonly candidateId: string) {}
}
