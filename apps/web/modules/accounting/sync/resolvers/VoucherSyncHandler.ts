import { SyncHandler } from './SyncHandler';
import { SyncContext } from '../types/SyncContext';
import { prisma } from '../../../../shared/db/prisma';
import { VoucherXmlBuilder } from '../../voucher/builders/VoucherXmlBuilder';
import { SyncStatus } from '@prisma/client';

export class VoucherSyncHandler implements SyncHandler {
  public aggregateType = 'Voucher';

  public async loadAggregate(context: SyncContext): Promise<any | null> {
    const voucher = await prisma.accountingVoucher.findUnique({
      where: { id: context.aggregateId }
    });

    if (!voucher) {
      throw new Error(`Voucher aggregate not found: ${context.aggregateId}`);
    }

    if (voucher.syncStatus === SyncStatus.SYNCED) {
      // Idempotency: Skip if already synced
      return null;
    }

    return voucher.payload;
  }

  public buildXml(aggregate: any, companyName: string): string {
    return VoucherXmlBuilder.build(aggregate as any, companyName);
  }

  public async updateSuccess(context: SyncContext, xmlRequest: string, xmlResponse: string): Promise<void> {
    await prisma.accountingVoucher.update({
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
    await prisma.accountingVoucher.update({
      where: { id: context.aggregateId },
      data: {
        syncStatus: isBusinessFailure ? SyncStatus.FAILED : SyncStatus.PROCESSING,
        lastSyncError: errorReason,
        syncAttempts: { increment: 1 }
      }
    });
  }
}
