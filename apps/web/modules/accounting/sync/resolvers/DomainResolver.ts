import { SyncHandler } from './SyncHandler';
import { VoucherSyncHandler } from './VoucherSyncHandler';
import { LedgerSyncHandler } from './LedgerSyncHandler';
import { MasterSyncHandler } from './MasterSyncHandler';

import { StockGroupSyncHandler } from '../../../inventory/stock-groups/sync/StockGroupSyncHandler';
import { StockCategorySyncHandler } from '../../../inventory/stock-categories/sync/StockCategorySyncHandler';
import { UnitSyncHandler } from '../../../inventory/units/sync/UnitSyncHandler';
import { GodownSyncHandler } from '../../../inventory/godowns/sync/GodownSyncHandler';
import { PriceLevelSyncHandler } from '../../../inventory/price-levels/sync/PriceLevelSyncHandler';
import { BatchSyncHandler } from '../../../inventory/batches/sync/BatchSyncHandler';
import { StockItemSyncHandler } from '../../../inventory/stock-items/sync/StockItemSyncHandler';

export class DomainResolver {
  private handlers: Map<string, SyncHandler> = new Map();

  constructor() {
    this.register(new VoucherSyncHandler());
    this.register(new LedgerSyncHandler());
    this.register(new MasterSyncHandler());

    // Inventory Bounded Context
    this.register(new StockGroupSyncHandler());
    this.register(new StockCategorySyncHandler());
    this.register(new UnitSyncHandler());
    this.register(new GodownSyncHandler());
    this.register(new PriceLevelSyncHandler());
    this.register(new BatchSyncHandler());
    this.register(new StockItemSyncHandler());
  }

  public register(handler: SyncHandler): void {
    this.handlers.set(handler.aggregateType, handler);
  }

  public resolve(aggregateType: string): SyncHandler {
    const handler = this.handlers.get(aggregateType);
    if (!handler) {
      throw new Error(`No SyncHandler registered for aggregate type: ${aggregateType}`);
    }
    return handler;
  }
}
