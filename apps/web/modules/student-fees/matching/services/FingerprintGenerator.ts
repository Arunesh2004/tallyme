import * as crypto from 'crypto';

export class FingerprintGenerator {
  /**
   * Generates a deterministic hash representing a unique payment.
   * If a payment arrives with the exact same details, it's a duplicate.
   */
  public static generate(
    admissionNumber: string | undefined,
    utr: string,
    amount: number,
    feeMonth: string,
    gateway: string
  ): string {
    const raw = `${admissionNumber || 'UNKNOWN'}|${utr}|${amount}|${feeMonth}|${gateway}`.toUpperCase();
    return crypto.createHash('sha256').update(raw).digest('hex');
  }
}
