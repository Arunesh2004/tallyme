export interface BaseMaster {
  name: string;
  parent?: string;
}

export interface LedgerGroup extends BaseMaster {
  isSubLedger?: boolean;
  affectsGrossProfit?: boolean;
}

export interface Unit extends BaseMaster {
  formalName?: string;
  decimalPlaces?: number;
}

export interface StockGroup extends BaseMaster {
  // Can be expanded as needed
}

export interface Godown extends BaseMaster {
  address?: string;
}

export interface CostCentre extends BaseMaster {
  // Cost Centres typically only have a name and parent category
}

export interface VoucherType extends BaseMaster {
  // Sync-only reading
  voucherTypeClass?: string;
}
