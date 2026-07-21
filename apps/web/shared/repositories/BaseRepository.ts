export interface BaseRepository<T> {
  findById(id: string, organizationId: string): Promise<T | null>;
  findAll(organizationId: string): Promise<T[]>;
  create(data: Partial<T>, organizationId: string, userId: string): Promise<T>;
  update(id: string, data: Partial<T>, organizationId: string, userId: string): Promise<T>;
  softDelete(id: string, organizationId: string, userId: string): Promise<void>;
}
