export interface IUseCase<TInput, TOutput> {
  execute(request?: TInput): Promise<TOutput>;
}

export interface IRepository<TEntity> {
  // Purposefully left empty.
  // Concrete repositories should define their own domain-specific methods (e.g. findByVendorCode).
  // We do not force generic CRUD operations like delete() on all repositories.
}

export interface ILogger {
  log(message: string, context?: string): void;
  error(message: string, trace?: string, context?: string): void;
  warn(message: string, context?: string): void;
  debug(message: string, context?: string): void;
}

export interface IClock {
  now(): Date;
}

export interface IIdGenerator {
  generateId(): string;
}
