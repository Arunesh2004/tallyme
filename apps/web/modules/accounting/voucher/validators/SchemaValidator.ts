import { z } from 'zod';
import { VoucherType } from '../enums/VoucherType';

export class SchemaValidator {
  private static ledgerEntrySchema = z.object({
    ledgerName: z.string().min(1, "Ledger name is required"),
    amount: z.number().positive("Amount must be positive"),
    isDeemedPositive: z.boolean(),
  });

  private static inventoryEntrySchema = z.object({
    itemName: z.string().min(1, "Item name is required"),
    quantity: z.number().positive("Quantity must be positive"),
    rate: z.number().positive("Rate must be positive").optional(),
    amount: z.number().positive("Amount must be positive"),
    billedQuantity: z.number().positive().optional(),
  });

  private static taxEntrySchema = z.object({
    taxLedgerName: z.string().min(1, "Tax ledger name is required"),
    taxAmount: z.number().positive("Tax amount must be positive"),
    isDeemedPositive: z.boolean(),
  });

  public static voucherSchema = z.object({
    voucherType: z.nativeEnum(VoucherType),
    date: z.string().regex(/^\d{4}-?\d{2}-?\d{2}$/, "Date must be in YYYY-MM-DD or YYYYMMDD format"),
    effectiveDate: z.string().regex(/^\d{4}-?\d{2}-?\d{2}$/).optional(),
    reference: z.string().optional(),
    referenceNumber: z.string().optional(),
    narration: z.string().optional(),
    ledgerEntries: z.array(this.ledgerEntrySchema).min(2, "At least two ledger entries are required for a valid accounting entry"),
    inventoryEntries: z.array(this.inventoryEntrySchema).optional(),
    taxEntries: z.array(this.taxEntrySchema).optional(),
    attachments: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional(),
  });

  public static validate(data: unknown) {
    return this.voucherSchema.parse(data);
  }
}
