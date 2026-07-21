import { z } from 'zod';

export class SchemaValidator {
  public static ledgerSchema = z.object({
    name: z.string().min(1, "Ledger name is required"),
    parentGroup: z.string().min(1, "Parent group is required"),
    openingBalance: z.number().min(0, "Opening balance cannot be negative").optional(),
    openingBalanceType: z.enum(['Debit', 'Credit']).optional(),
    gstDetails: z.object({
      gstin: z.string().optional(),
      registrationType: z.string().optional(),
    }).optional(),
    address: z.string().optional(),
    email: z.string().email("Invalid email format").optional(),
    phone: z.string().optional(),
    pan: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    pincode: z.string().optional(),
  });

  public static validate(data: unknown) {
    return this.ledgerSchema.parse(data);
  }
}
