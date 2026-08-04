export class LedgerResolutionResult {
  public readonly ledgerId: string | null;
  public readonly isResolved: boolean;
  public readonly reason: string;

  constructor(ledgerId: string | null, isResolved: boolean, reason: string) {
    this.ledgerId = ledgerId;
    this.isResolved = isResolved;
    this.reason = reason;
  }
}
