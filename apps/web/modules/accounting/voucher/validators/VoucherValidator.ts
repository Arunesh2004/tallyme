import { prisma } from '../../../../shared/db/prisma';
import { CompiledVoucher } from '../compilers/VoucherCompiler';

export class VoucherValidator {
  
  public static async validate(compiled: CompiledVoucher, organizationId: string): Promise<void> {
    
    if (!compiled.entries || compiled.entries.length < 2) {
      throw new Error('VOUCHER_VALIDATION_FAILURE: Voucher must contain at least 2 entries (one debit, one credit).');
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of compiled.entries) {
      if (entry.isDebit) {
        totalDebit += entry.amount;
      } else {
        totalCredit += entry.amount;
      }

      // Validate Ledger Existence and Active State
      const ledger = await prisma.accountingLedger.findUnique({
        where: { id: entry.ledgerId }
      });

      if (!ledger) {
        throw new Error(`VOUCHER_VALIDATION_FAILURE: Ledger ID ${entry.ledgerId} does not exist.`);
      }

      if (ledger.organizationId !== organizationId) {
        throw new Error(`VOUCHER_VALIDATION_FAILURE: Ledger ID ${entry.ledgerId} does not belong to organization ${organizationId}.`);
      }

      if (!ledger.isActive) {
        throw new Error(`VOUCHER_VALIDATION_FAILURE: Ledger '${ledger.name}' (${ledger.id}) is inactive.`);
      }
    }

    // Double Entry Check
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`VOUCHER_VALIDATION_FAILURE: Imbalanced Voucher. Debits (${totalDebit}) !== Credits (${totalCredit}).`);
    }

    // Voucher Date Validation
    if (compiled.date > new Date()) {
      throw new Error('VOUCHER_VALIDATION_FAILURE: Voucher date cannot be in the future.');
    }
  }
}
