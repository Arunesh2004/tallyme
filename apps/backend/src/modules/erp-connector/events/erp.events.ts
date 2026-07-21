export class VoucherSyncStartedEvent {
  constructor(public readonly voucherCandidateId: string) {}
}

export class VoucherSyncSucceededEvent {
  constructor(
    public readonly voucherCandidateId: string,
    public readonly erpRef: string,
  ) {}
}

export class VoucherSyncFailedEvent {
  constructor(
    public readonly voucherCandidateId: string,
    public readonly reason: string,
  ) {}
}

export class RetryScheduledEvent {
  constructor(
    public readonly voucherCandidateId: string,
    public readonly attempt: number,
  ) {}
}
