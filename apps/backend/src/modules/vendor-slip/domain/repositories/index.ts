import {
  ITransactionContext,
  Page,
  PageRequest,
} from '../../../shared/domain/repositories';
import { Result } from '../../../shared/domain/result';

// Stubs for Domain Entities
export type Vendor = { id: string };
export type VendorLedgerProfile = { id: string };
export type InvoiceDocument = { id: string };
export type OCRResult = { id: string };
export type InvoiceCandidate = { id: string };
export type VendorMatch = { id: string };
export type ExpenseAllocation = { id: string };
export type ManualReviewTask = { id: string };

export interface VendorQuery {
  gstin?: string;
  pan?: string;
  exactName?: string;
  fuzzyName?: string;
  vendorCode?: string;
}

export interface IVendorRepository {
  findVendorByCriteria(query: VendorQuery): Promise<Vendor | null>;
  searchVendorsFuzzy(name: string, threshold: number): Promise<Vendor[]>;
  getVendorById(vendorId: string): Promise<Vendor | null>;
}

export interface IVendorLedgerProfileRepository {
  findLedgerMappingForVendor(
    vendorId: string,
  ): Promise<VendorLedgerProfile | null>;
}

export interface IInvoiceDocumentRepository {
  saveUploadedDocument(
    document: InvoiceDocument,
    tx?: ITransactionContext,
  ): Promise<void>;
  findPendingOCRDocuments(page: PageRequest): Promise<Page<InvoiceDocument>>;
  markAsCorrupted(documentId: string, reason: string): Promise<void>;
}

export interface IOCRResultRepository {
  saveOCRResult(result: OCRResult, tx: ITransactionContext): Promise<void>;
}

export interface IInvoiceCandidateRepository {
  saveExtractedCandidate(
    candidate: InvoiceCandidate,
    tx: ITransactionContext,
  ): Promise<void>;
  existsByVendorAndInvoiceNumber(
    vendorId: string,
    invoiceNumber: string,
  ): Promise<boolean>;
  findPendingVendorMatching(): Promise<InvoiceCandidate[]>;
}

export interface IVendorMatchRepository {
  saveMatchedInvoice(
    match: VendorMatch,
    tx: ITransactionContext,
  ): Promise<void>;
  findPendingExpenseValidation(): Promise<VendorMatch[]>;
}

export interface IExpenseAllocationRepository {
  saveValidatedExpense(
    allocation: ExpenseAllocation,
    tx: ITransactionContext,
  ): Promise<void>;
  findPendingLedgerMapping(): Promise<ExpenseAllocation[]>;
}

export interface IManualReviewRepository {
  routeToManualReview(
    task: ManualReviewTask,
    tx?: ITransactionContext,
  ): Promise<void>;
  findPendingReviews(page: PageRequest): Promise<Page<ManualReviewTask>>;
  resolveReview(
    taskId: string,
    resolutionData: any,
    tx: ITransactionContext,
  ): Promise<void>;
}
