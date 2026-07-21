import { z } from 'zod';
import { MasterType } from '../entities/MasterType';

export class SchemaValidator {
  private static baseMasterSchema = z.object({
    name: z.string().min(1, "Name is required"),
    parent: z.string().optional(),
  });

  public static ledgerGroupSchema = this.baseMasterSchema.extend({
    masterType: z.literal(MasterType.LedgerGroup),
    isSubLedger: z.boolean().optional(),
    affectsGrossProfit: z.boolean().optional(),
  });

  public static unitSchema = this.baseMasterSchema.extend({
    masterType: z.literal(MasterType.Unit),
    formalName: z.string().optional(),
    decimalPlaces: z.number().min(0).max(4).optional(),
  });

  public static godownSchema = this.baseMasterSchema.extend({
    masterType: z.literal(MasterType.Godown),
    address: z.string().optional(),
  });

  public static stockGroupSchema = this.baseMasterSchema.extend({
    masterType: z.literal(MasterType.StockGroup),
  });

  public static costCentreSchema = this.baseMasterSchema.extend({
    masterType: z.literal(MasterType.CostCentre),
  });

  public static masterSchema = z.discriminatedUnion('masterType', [
    this.ledgerGroupSchema,
    this.unitSchema,
    this.godownSchema,
    this.stockGroupSchema,
    this.costCentreSchema,
  ]);

  public static validate(data: unknown) {
    return this.masterSchema.parse(data);
  }
}
