import {
  ExtractionConfidence,
  ValidationStatus,
} from './extraction-confidence';

export enum TransactionType {
  PAYMENT = 'PAYMENT',
  RECEIPT = 'RECEIPT',
  JOURNAL = 'JOURNAL',
  PURCHASE = 'PURCHASE',
  SALES = 'SALES',
  CONTRA = 'CONTRA',
}

export interface AccountingParty {
  id: string;
  type: 'VENDOR' | 'STUDENT' | 'EMPLOYEE' | 'OTHER';
  ledgerName: string;
}

export interface AccountingLineItem {
  id: string;
  ledgerName: string;
  amount: number;
  isDebit: boolean;
  costCentre?: string;
  confidence?: ExtractionConfidence<number>;
}

export interface AccountingTaxLine {
  id: string;
  taxType: string;
  ledgerName: string;
  amount: number;
}

export class AccountingTransaction {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly transactionType: TransactionType,
    public readonly sourceModule: string,
    public readonly transactionDate: Date,
    public readonly parties: AccountingParty[],
    public readonly lineItems: AccountingLineItem[],
    public readonly taxes: AccountingTaxLine[],
    public readonly amount: number,
    public readonly metadata: Record<string, any>,
    public readonly confidence: ExtractionConfidence<any>[],
    public readonly validationResult: ValidationStatus,
  ) {}
}
