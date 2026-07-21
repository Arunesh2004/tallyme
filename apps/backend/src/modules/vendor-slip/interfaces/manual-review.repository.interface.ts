export interface IManualReviewRepository {
  create(data: any): Promise<any>;
  assign(id: string, userId: string): Promise<any>;
  resolve(id: string, resolution: string, tx?: any): Promise<any>;
  reject(id: string, resolution: string, tx?: any): Promise<any>;
  findPending(limit?: number, offset?: number): Promise<any[]>;
}
