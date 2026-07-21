import { VoucherType } from '../enums/VoucherType';

export interface CreateVoucherDTO {
  voucherType: VoucherType;
  date: string; // ISO format or YYYY-MM-DD
  effectiveDate?: string;
  reference?: string;
  referenceNumber?: string;
  narration?: string;
  ledgerEntries: {
    ledgerName: string;
    amount: number;
    isDeemedPositive: boolean;
  }[];
  inventoryEntries?: {
    itemName: string;
    quantity: number;
    rate?: number;
    amount: number;
    billedQuantity?: number;
  }[];
  taxEntries?: {
    taxLedgerName: string;
    taxAmount: number;
    isDeemedPositive: boolean;
  }[];
  attachments?: string[];
  metadata?: Record<string, any>;
}
