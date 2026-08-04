import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsNumber,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TallyLedgerEntryDTO {
  @IsString()
  @IsNotEmpty()
  ledgerName!: string;

  @IsString()
  @IsOptional()
  stockItemName?: string;

  @IsBoolean()
  isDebit!: boolean;

  @IsBoolean()
  isParty!: boolean;

  @IsNumber()
  amount!: number;

  @IsString()
  @IsOptional()
  hsnCode?: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @IsOptional()
  rate?: number;
}

export class TallyVoucherDTO {
  @IsString()
  @IsNotEmpty()
  voucherNumber!: string;

  @IsString()
  @IsOptional()
  guid?: string;

  @IsString()
  @IsNotEmpty()
  date!: string;

  @IsString()
  @IsNotEmpty()
  voucherType!: string;

  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  narration?: string;

  @IsString()
  @IsOptional()
  partyLedgerName?: string;

  // Supplier Additions
  @IsString()
  @IsOptional()
  supplierGstin?: string;

  @IsString()
  @IsOptional()
  supplierPan?: string;

  @IsString()
  @IsOptional()
  supplierState?: string;

  @IsString()
  @IsOptional()
  placeOfSupply?: string;

  // Invoice Metadata Additions
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsString()
  @IsOptional()
  purchaseOrder?: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  // GST Additions
  @IsNumber()
  @IsOptional()
  cgst?: number;

  @IsNumber()
  @IsOptional()
  sgst?: number;

  @IsNumber()
  @IsOptional()
  igst?: number;

  @IsNumber()
  @IsOptional()
  cess?: number;

  @IsBoolean()
  @IsOptional()
  isEdit?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(2)
  @Type(() => TallyLedgerEntryDTO)
  lines!: TallyLedgerEntryDTO[];
}
