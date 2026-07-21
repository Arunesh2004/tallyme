// services/index.ts
export abstract class DomainService {
  // Base class for domain services.
  // Contains pure domain logic, no repositories or infrastructure.
}

// factories/index.ts
export interface IFactory<TEntity, TProps> {
  create(props: TProps): TEntity;
}

// policies/index.ts
export interface IDomainPolicy<T> {
  isSatisfiedBy(context: T): boolean;
}

// index.ts
export * from './enums';
export * from './result';
export * from './specification';
export * from './value-objects';
