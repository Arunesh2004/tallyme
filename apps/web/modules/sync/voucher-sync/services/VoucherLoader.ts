import { prisma } from '../../../../shared/db/prisma';

export class VoucherLoader {
  /**
   * Fetches the AccountingVoucher, including all relational entries and their Ledgers.
   */
  public async load(voucherId: string, organizationId: string) {
    const voucher = await prisma.accountingVoucher.findUnique({
      where: {
        id: voucherId,
        organizationId
      },
      include: {
        entries: {
          include: {
            ledger: true
          }
        }
      }
    });

    if (!voucher) {
      throw new Error(`VoucherLoader: Voucher ${voucherId} not found in org ${organizationId}`);
    }

    return voucher;
  }
}
