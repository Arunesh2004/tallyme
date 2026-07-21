export enum MasterType {
  LedgerGroup = 'LedgerGroup',
  Unit = 'Unit',
  StockGroup = 'StockGroup',
  Godown = 'Godown',
  CostCentre = 'CostCentre',
  VoucherType = 'VoucherType', // For sync only
}

export const TallyMasterNodeMap: Record<MasterType, string> = {
  [MasterType.LedgerGroup]: 'GROUP',
  [MasterType.Unit]: 'UNIT',
  [MasterType.StockGroup]: 'STOCKGROUP',
  [MasterType.Godown]: 'GODOWN',
  [MasterType.CostCentre]: 'COSTCENTRE',
  [MasterType.VoucherType]: 'VOUCHERTYPE',
};

export const TallyAccountTypeMap: Record<MasterType, string> = {
  [MasterType.LedgerGroup]: 'Groups',
  [MasterType.Unit]: 'Units',
  [MasterType.StockGroup]: 'Stock Groups',
  [MasterType.Godown]: 'Godowns',
  [MasterType.CostCentre]: 'Cost Centres',
  [MasterType.VoucherType]: 'Voucher Types',
};
