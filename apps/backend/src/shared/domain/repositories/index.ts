// Pagination
export interface PageRequest {
  page: number;
  size: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

// Transaction Context Placeholder
// This will map to the TransactionClient from Module 3 at the infrastructure layer,
// but remains opaque to the domain.
export interface ITransactionContext {
  // Opaque marker interface for passing transactions
}
