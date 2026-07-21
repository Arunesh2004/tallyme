import { MasterType } from '../entities/MasterType';

export interface BaseCreateMasterDTO {
  masterType: MasterType;
  name: string;
  parent?: string;
}

export interface CreateLedgerGroupDTO extends BaseCreateMasterDTO {
  masterType: MasterType.LedgerGroup;
  isSubLedger?: boolean;
  affectsGrossProfit?: boolean;
}

export interface CreateUnitDTO extends BaseCreateMasterDTO {
  masterType: MasterType.Unit;
  formalName?: string;
  decimalPlaces?: number;
}

export interface CreateGodownDTO extends BaseCreateMasterDTO {
  masterType: MasterType.Godown;
  address?: string;
}

export interface CreateStockGroupDTO extends BaseCreateMasterDTO {
  masterType: MasterType.StockGroup;
}

export interface CreateCostCentreDTO extends BaseCreateMasterDTO {
  masterType: MasterType.CostCentre;
}

export type CreateMasterDTO = 
  | CreateLedgerGroupDTO 
  | CreateUnitDTO 
  | CreateGodownDTO 
  | CreateStockGroupDTO 
  | CreateCostCentreDTO;
