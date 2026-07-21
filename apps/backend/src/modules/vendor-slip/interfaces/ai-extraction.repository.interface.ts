export interface IInvoiceCandidateRepository {
  create(data: any): Promise<any>;
  findLatestByDocument(documentId: string): Promise<any>;
  findHistory(documentId: string): Promise<any[]>;
  exists(documentId: string): Promise<boolean>;
}
