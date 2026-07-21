export interface IInvoiceDocumentRepository {
  findByChecksum(checksum: string): Promise<any>;
  findById(id: string): Promise<any>;
  create(data: any): Promise<any>; // Should be idempotent, check checksum
  markStatus(id: string, status: any): Promise<void>;
  exists(checksum: string): Promise<boolean>;
}

export interface IOCRResultRepository {
  findByDocument(documentId: string): Promise<any>;
  create(data: any): Promise<any>; // Should be idempotent, check documentId
  exists(documentId: string): Promise<boolean>;
}
