import { SyncHandler } from './SyncHandler';
import { SyncContext } from '../types/SyncContext';
import { prisma } from '../../../../shared/db/prisma';
import { LedgerXmlBuilder } from '../../ledger/builders/LedgerXmlBuilder';
import { SyncStatus } from '@prisma/client';

export class LedgerSyncHandler implements SyncHandler {
  public aggregateType = 'Ledger';

  public async loadAggregate(context: SyncContext): Promise<any | null> {
    const ledger = await prisma.accountingLedger.findUnique({
      where: { id: context.aggregateId }
    });

    if (!ledger) {
      throw new Error(`Ledger aggregate not found: ${context.aggregateId}`);
    }

    if (ledger.syncStatus === SyncStatus.SYNCED) {
      return null;
    }

    return ledger.payload;
  }

  public buildXml(aggregate: any, companyName: string): string {
    return LedgerXmlBuilder.build(aggregate as any, companyName);
  }

  public async updateSuccess(context: SyncContext, xmlRequest: string, xmlResponse: string): Promise<void> {
    await prisma.accountingLedger.update({
      where: { id: context.aggregateId },
      data: {
        syncStatus: SyncStatus.SYNCED,
        lastSyncAt: new Date(),
        syncAttempts: { increment: 1 },
        xmlRequest,
        xmlResponse
      }
    });
  }

  public async updateFailure(context: SyncContext, errorReason: string, isBusinessFailure: boolean): Promise<void> {
    await prisma.accountingLedger.update({
      where: { id: context.aggregateId },
      data: {
        syncStatus: isBusinessFailure ? SyncStatus.FAILED : SyncStatus.PROCESSING,
        lastSyncError: errorReason,
        syncAttempts: { increment: 1 }
      }
    });
  }
}
