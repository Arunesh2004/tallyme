export class GatewayDetectedEvent {
  constructor(
    public readonly emailId: string,
    public readonly gateway: string,
  ) {}
}

export class PaymentCandidateCreatedEvent {
  constructor(public readonly candidateId: string) {}
}

export class LowConfidenceDetectedEvent {
  constructor(
    public readonly candidateId: string,
    public readonly confidence: number,
  ) {}
}

export class DuplicateCandidateDetectedEvent {
  constructor(public readonly candidateId: string) {}
}

export class ParserFailedEvent {
  constructor(
    public readonly emailId: string,
    public readonly error: string,
  ) {}
}
