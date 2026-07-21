export class RepositoryError extends Error {
  constructor(message: string, public readonly cause?: any) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class DuplicateDocumentError extends RepositoryError {
  constructor(checksum: string, cause?: any) {
    super(`Document with checksum ${checksum} already exists`, cause);
  }
}

export class DuplicateInvoiceError extends RepositoryError {
  constructor(vendorId: string, invoiceNumber: string, cause?: any) {
    super(`Invoice ${invoiceNumber} already exists for vendor ${vendorId}`, cause);
  }
}

export class VendorNotFoundError extends RepositoryError {
  constructor(identifier: string, cause?: any) {
    super(`Vendor not found with identifier: ${identifier}`, cause);
  }
}

export class UniqueConstraintViolationError extends RepositoryError {
  constructor(entity: string, field: string, cause?: any) {
    super(`Unique constraint violated for ${entity} on field ${field}`, cause);
  }
}

export class TransactionFailureError extends RepositoryError {
  constructor(message: string, cause?: any) {
    super(`Transaction failed: ${message}`, cause);
  }
}
