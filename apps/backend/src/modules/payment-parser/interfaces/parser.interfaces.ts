export interface PaymentCandidateDomain {
  gateway: string;
  transactionId: string | null;
  utr: string | null;
  referenceNumber: string | null;
  amount: number | null;
  currency: string | null;
  studentName: string | null;
  admissionNumber: string | null;
  feeMonth: string | null;
  feeYear: number | null;
  paymentDate: Date | null;
  emailId: string;
  sender: string;
  subject: string;
  confidence: number;
  missingFields: string[];
  rawData: any;
}

export interface IBasePaymentParser {
  identifier: string;
  canParse(email: any): boolean;
  parse(email: any): Promise<PaymentCandidateDomain>;
}

export interface IPaymentParserRepository {
  saveCandidate(candidate: any): Promise<any>;
  logAttempt(attempt: any): Promise<void>;
  saveParsingResult(candidateData: any, attemptData: any): Promise<any>;
  findSimilarCandidates(criteria: any): Promise<any[]>;
}
