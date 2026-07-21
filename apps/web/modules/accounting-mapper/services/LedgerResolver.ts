import { prisma } from '../../../shared/db/prisma';

export class LedgerResolver {
  /**
   * Resolves a mappingKey into a concrete Ledger ID.
   * Throws an error if the mapping does not exist, triggering Manual Review.
   */
  public async resolve(mappingKey: string, organizationId: string): Promise<string> {
    const mapping = await prisma.ledgerMapping.findUnique({
      where: {
        uq_ledger_mapping: {
          organizationId,
          mappingKey
        }
      }
    });

    if (!mapping) {
      throw new Error(`MISSING_LEDGER_MAPPING: No ledger mapped for key '${mappingKey}' in organization '${organizationId}'`);
    }

    return mapping.ledgerId;
  }
}
