export interface IExpenseAllocationRepository {
  create(data: any, tx?: any): Promise<any>;
  findByVendor(vendorId: string, limit?: number, offset?: number): Promise<any[]>;
  findByInvoice(invoiceNumber: string, vendorId: string): Promise<any>;
  findReadyForVoucher(limit?: number, offset?: number): Promise<any[]>;
  findByStatus(status: any, limit?: number, offset?: number): Promise<any[]>;
}
