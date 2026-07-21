export interface IVendorRepository {
  findById(id: string, includeDeleted?: boolean): Promise<any>;
  findByGSTIN(gstin: string, includeDeleted?: boolean): Promise<any>;
  findByVendorCode(code: string, includeDeleted?: boolean): Promise<any>;
  searchByName(name: string, limit?: number, offset?: number): Promise<any[]>;
  exists(id: string): Promise<boolean>;
  
  create(data: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  softDelete(id: string): Promise<void>;
}

export interface IVendorLedgerProfileRepository {
  findByVendorId(vendorId: string): Promise<any>;
  createOrUpdate(vendorId: string, data: any): Promise<any>;
}
