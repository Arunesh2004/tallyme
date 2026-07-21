export interface IVendorMatchRepository {
  create(data: any, tx?: any): Promise<any>;
  findByInvoiceCandidate(invoiceCandidateId: string): Promise<any>;
  updateStatus(id: string, status: any, tx?: any): Promise<any>;
}
