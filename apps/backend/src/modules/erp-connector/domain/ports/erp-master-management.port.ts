export interface IERPMasterManagementAdapter {
  createGroup(dto: CreateGroupDTO): Promise<MasterOperationResult>;
  createLedger(dto: CreateLedgerDTO): Promise<MasterOperationResult>;
  updateLedger(dto: UpdateLedgerDTO): Promise<MasterOperationResult>;
  moveLedger(dto: MoveLedgerDTO): Promise<MasterOperationResult>;
  createCostCentre(dto: CreateCostCentreDTO): Promise<MasterOperationResult>;
  deleteGroup(name: string): Promise<MasterOperationResult>;
  deleteLedger(name: string): Promise<MasterOperationResult>;
  validateMaster(entityType: string, entityName: string): Promise<boolean>;
}

export interface MasterOperationResult {
  success: boolean;
  requestHash: string;
  responseHash?: string;
  errorMessage?: string;
}

export interface CreateGroupDTO {
  name: string;
  parent: string;
}

export interface CreateLedgerDTO {
  name: string;
  parent: string;
}

export interface UpdateLedgerDTO {
  name: string;
  parent?: string;
  metadata?: Record<string, any>;
}

export interface MoveLedgerDTO {
  name: string;
  newParent: string;
}

export interface CreateCostCentreDTO {
  name: string;
  category?: string;
}
