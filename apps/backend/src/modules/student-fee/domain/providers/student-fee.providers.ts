import { EmailDocumentStatus } from '@prisma/client';

export interface EmailMetadata {
  messageId: string;
  subject?: string;
  sender?: string;
  receivedAt: Date;
  source: string;
  checksum: string;
}

export interface IGmailHistoryProvider {
  syncHistory(): Promise<EmailMetadata[]>;
  fetchEmailContent(messageId: string): Promise<string>;
}

export interface ParsedEmail {
  textBody: string;
  attachments?: any[];
  htmlBody?: string;
}

export interface IEmailParser {
  parse(rawContent: string): Promise<ParsedEmail>;
}

export interface ExtractedPaymentData {
  paymentGateway?: string;
  gatewayTransactionId?: string;
  utr?: string;
  bankReference?: string;
  payerEmail?: string;
  payerPhone?: string;
  rawStudentName?: string;
  amount?: number;
  paymentDate?: Date;
  confidence: number;
}

export interface IPaymentExtractionProvider {
  extractPaymentDetails(
    parsedEmail: ParsedEmail,
  ): Promise<ExtractedPaymentData>;
}

export interface StudentMatchResultData {
  studentId: string | null;
  confidence: number;
  matchingStrategy: string;
  candidateList: any[] | null;
}

export interface IStudentMatcher {
  matchStudent(
    paymentData: ExtractedPaymentData,
  ): Promise<StudentMatchResultData>;
}

export interface OutstandingFeeData {
  feeId: string;
  studentId: string;
  amount: number;
  dueDate: Date;
  description: string;
}

export interface IOutstandingFeeProvider {
  getOutstandingFees(studentId: string): Promise<OutstandingFeeData[]>;
}

export interface FeeAllocationResult {
  totalAllocated: number;
  allocationType: 'EXACT' | 'PARTIAL' | 'ADVANCE' | 'OVERPAYMENT';
  allocatedFees: {
    outstandingFeeId: string;
    amount: number;
  }[];
}

export interface IFeeAllocator {
  allocate(
    amount: number,
    outstandingFees: OutstandingFeeData[],
  ): Promise<FeeAllocationResult>;
}
