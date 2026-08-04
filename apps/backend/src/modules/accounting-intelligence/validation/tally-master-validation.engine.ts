import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AccountingTransaction } from '../../../shared/domain/accounting-transaction';

export interface MissingMaster {
  type: string;
  name: string;
}

export interface TallyMasterValidationResult {
  valid: boolean;
  missingMasters: MissingMaster[];
  warnings: string[];
}

@Injectable()
export class TallyMasterValidationEngine {
  constructor(private readonly prisma: PrismaService) {}

  async validate(
    transaction: AccountingTransaction,
  ): Promise<TallyMasterValidationResult> {
    const latestDiscovery = await this.prisma.tallyDiscoveryReport.findFirst({
      where: { companyId: transaction.companyId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestDiscovery) {
      return {
        valid: true,
        missingMasters: [],
        warnings: [
          'No Tally Discovery Report available for validation, assuming valid.',
        ],
      };
    }

    const discoveredLedgers = await this.prisma.discoveryLedger.findMany({
      where: { tallyDiscoveryReportId: latestDiscovery.id },
    });

    // Because the actual data structure stored inside 'data' is { name: 'Ledger Name', type: 'LEDGER' }
    // We will extract names to a set
    const ledgerNames = new Set(
      discoveredLedgers.map((l) => {
        const data = l.data as any;
        return data.name?.toLowerCase();
      }),
    );

    const missingMasters: MissingMaster[] = [];

    // Extract all unique ledgers required by transaction
    transaction.parties.forEach((p) => {
      if (!ledgerNames.has(p.ledgerName.toLowerCase())) {
        missingMasters.push({
          type:
            p.type === 'VENDOR'
              ? 'VENDOR_MASTER'
              : p.type === 'STUDENT'
                ? 'STUDENT_MASTER'
                : 'PARTY_LEDGER',
          name: p.ledgerName,
        });
      }
    });

    transaction.lineItems.forEach((l) => {
      if (!ledgerNames.has(l.ledgerName.toLowerCase())) {
        missingMasters.push({
          type: 'EXPENSE_INCOME_LEDGER',
          name: l.ledgerName,
        });
      }
    });

    transaction.taxes.forEach((t) => {
      if (!ledgerNames.has(t.ledgerName.toLowerCase())) {
        missingMasters.push({ type: 'GST_LEDGER', name: t.ledgerName });
      }
    });

    return {
      valid: missingMasters.length === 0,
      missingMasters,
      warnings: [],
    };
  }
}
