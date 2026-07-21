import { Ledger } from '../entities/Ledger';

export class BusinessValidator {
  public static validate(ledger: Ledger): void {
    if (ledger.openingBalance > 0 && !ledger.openingBalanceType) {
      throw new Error("Opening balance type (Debit/Credit) must be specified if opening balance is greater than 0");
    }

    if (ledger.gstDetails?.gstin && ledger.pan) {
      // Basic check: PAN should be embedded in GSTIN (characters 3 to 12)
      // GSTIN format: 2 chars state code + 10 chars PAN + 3 chars
      const gstinPan = ledger.gstDetails.gstin.substring(2, 12);
      if (gstinPan.toUpperCase() !== ledger.pan.toUpperCase()) {
        throw new Error("PAN does not match the PAN embedded within the GSTIN");
      }
    }
  }
}
