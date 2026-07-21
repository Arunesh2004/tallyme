import { SyncHandler } from './SyncHandler';
import { SyncContext } from '../types/SyncContext';
import { prisma } from '../../../../shared/db/prisma';
import { MasterXmlBuilder } from '../../masters/builders/MasterXmlBuilder';
import { SyncStatus } from '@prisma/client';

export class MasterSyncHandler implements SyncHandler {
  public aggregateType = 'Master';

  public async loadAggregate(context: SyncContext): Promise<any | null> {
    const master = await prisma.accountingMaster.findUnique({
      where: { id: context.aggregateId }
    });

    if (!master) {
      throw new Error(`Master aggregate not found: ${context.aggregateId}`);
    }

    if (master.syncStatus === SyncStatus.SYNCED) {
      return null;
    }

    // payload contains { masterType, ...entityData } which is perfect for the builder
    return master.payload;
  }

  public buildXml(aggregate: any, companyName: string): string {
    const masterType = aggregate.masterType;
    return MasterXmlBuilder.build(masterType, aggregate as any, companyName);
  }

  public async updateSuccess(context: SyncContext, xmlRequest: string, xmlResponse: string): Promise<void> {
    await prisma.accountingMaster.update({
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
    await prisma.accountingMaster.update({
      where: { id: context.aggregateId },
      data: {
        syncStatus: isBusinessFailure ? SyncStatus.FAILED : SyncStatus.PROCESSING,
        lastSyncError: errorReason,
        syncAttempts: { increment: 1 }
      }
    });
  }
}
