import { VoucherType } from '../enums/VoucherType';
import { LedgerEntry } from './LedgerEntry';
import { InventoryEntry } from './InventoryEntry';
import { TaxEntry } from './TaxEntry';

export interface Voucher {
  id?: string;
  voucherNumber?: string;
  voucherType: VoucherType;
  date: string; // YYYYMMDD
  effectiveDate?: string;
  reference?: string;
  referenceNumber?: string;
  narration?: string;
  ledgerEntries: LedgerEntry[];
  inventoryEntries?: InventoryEntry[];
  taxEntries?: TaxEntry[];
  attachments?: string[];
  metadata?: Record<string, any>;
}
