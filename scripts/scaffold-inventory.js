const fs = require('fs');
const path = require('path');

const slices = [
  { folder: 'stock-groups', model: 'InventoryStockGroup', entityName: 'StockGroup', builderTag: 'STOCKGROUP' },
  { folder: 'stock-categories', model: 'InventoryStockCategory', entityName: 'StockCategory', builderTag: 'STOCKCATEGORY' },
  { folder: 'units', model: 'InventoryUnit', entityName: 'Unit', builderTag: 'UNIT' },
  { folder: 'godowns', model: 'InventoryGodown', entityName: 'Godown', builderTag: 'GODOWN' },
  { folder: 'price-levels', model: 'InventoryPriceLevel', entityName: 'PriceLevel', builderTag: 'PRICELEVEL' },
  { folder: 'batches', model: 'InventoryBatch', entityName: 'Batch', builderTag: 'BATCH' },
  { folder: 'stock-items', model: 'InventoryStockItem', entityName: 'StockItem', builderTag: 'STOCKITEM' },
];

const basePath = path.join(__dirname, '..', '..', '..', 'apps', 'web', 'modules', 'inventory');

function createDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

slices.forEach(slice => {
  const slicePath = path.join(basePath, slice.folder);
  createDir(path.join(slicePath, 'entities'));
  createDir(path.join(slicePath, 'repositories'));
  createDir(path.join(slicePath, 'builders'));
  createDir(path.join(slicePath, 'sync'));

  // SyncHandler
  const syncHandlerContent = `import { SyncHandler } from '../../../accounting/sync/resolvers/SyncHandler';
import { SyncContext } from '../../../accounting/sync/types/SyncContext';
import { prisma } from '../../../../shared/db/prisma';
import { ${slice.entityName}XmlBuilder } from '../builders/${slice.entityName}XmlBuilder';
import { SyncStatus } from '@prisma/client';

export class ${slice.entityName}SyncHandler implements SyncHandler {
  public aggregateType = '${slice.entityName}';

  public async loadAggregate(context: SyncContext): Promise<any | null> {
    const record = await prisma.${slice.model[0].toLowerCase() + slice.model.slice(1)}.findUnique({
      where: { id: context.aggregateId }
    });

    if (!record) throw new Error(\`${slice.entityName} not found: \${context.aggregateId}\`);
    if (record.syncStatus === SyncStatus.SYNCED) return null;
    return record.payload;
  }

  public buildXml(aggregate: any, companyName: string): string {
    return ${slice.entityName}XmlBuilder.build(aggregate as any, companyName);
  }

  public async updateSuccess(context: SyncContext, xmlRequest: string, xmlResponse: string): Promise<void> {
    await prisma.${slice.model[0].toLowerCase() + slice.model.slice(1)}.update({
      where: { id: context.aggregateId },
      data: { syncStatus: SyncStatus.SYNCED, lastSyncAt: new Date(), syncAttempts: { increment: 1 }, xmlRequest, xmlResponse }
    });
  }

  public async updateFailure(context: SyncContext, errorReason: string, isBusinessFailure: boolean): Promise<void> {
    await prisma.${slice.model[0].toLowerCase() + slice.model.slice(1)}.update({
      where: { id: context.aggregateId },
      data: { syncStatus: isBusinessFailure ? SyncStatus.FAILED : SyncStatus.PROCESSING, lastSyncError: errorReason, syncAttempts: { increment: 1 } }
    });
  }
}
`;
  fs.writeFileSync(path.join(slicePath, 'sync', `${slice.entityName}SyncHandler.ts`), syncHandlerContent);

  // XmlBuilder
  const xmlBuilderContent = `import { XmlBuilder } from '../../../../shared/tally/builders/XmlBuilder';

export class ${slice.entityName}XmlBuilder {
  public static build(data: any, companyName: string): string {
    return XmlBuilder.buildMasterRequest({
      companyName,
      masterType: '${slice.builderTag}',
      data
    });
  }
}
`;
  fs.writeFileSync(path.join(slicePath, 'builders', `${slice.entityName}XmlBuilder.ts`), xmlBuilderContent);
});

console.log('Scaffolding complete for ' + slices.map(s => s.entityName).join(', '));
