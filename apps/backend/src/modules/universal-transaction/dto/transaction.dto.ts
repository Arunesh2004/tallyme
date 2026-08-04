import { IsString, IsNotEmpty, IsEnum, IsOptional, ValidateNested, IsArray, IsBoolean, IsUUID, IsDateString, IsNumberString, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionIntent, AccountingSide } from '../domain/enums';
import { TransactionStatus } from '@prisma/client';
import { CanonicalAccountingModel, TransactionHeader, TransactionParties, TaxAndCompliance, LedgerEntry, InventoryEntry, TransactionMetadata } from '../domain/types';

export class TransactionHeaderDto implements TransactionHeader {
  @ApiProperty({ description: 'The unique tenant identifier' })
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @ApiProperty({ enum: TransactionIntent, description: 'Nature of the transaction' })
  @IsEnum(TransactionIntent)
  transactionIntent!: TransactionIntent;

  @ApiPropertyOptional({ description: 'Specific ERP voucher type' })
  @IsString()
  @IsOptional()
  voucherType?: string;

  @ApiProperty({ description: 'ERP Company ID' })
  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @ApiProperty({ description: 'Financial year context, e.g. 2023-2024' })
  @IsString()
  @IsNotEmpty()
  financialYear!: string;

  @ApiProperty({ description: 'Currency code, e.g. INR' })
  @IsString()
  @IsNotEmpty()
  currency!: string;

  @ApiProperty({ description: 'Exchange rate used' })
  @IsNumberString()
  @IsNotEmpty()
  exchangeRate!: string;

  @ApiPropertyOptional({ description: 'Transaction narration' })
  @IsString()
  @IsOptional()
  narration?: string;

  @ApiPropertyOptional({ description: 'Related reference numbers', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  referenceNumbers?: string[];

  @ApiPropertyOptional({ description: 'Supplier Invoice Number' })
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Invoice Date in ISO Format YYYY-MM-DD' })
  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @ApiPropertyOptional({ description: 'Due Date in ISO Format YYYY-MM-DD' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Payment terms description' })
  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @ApiProperty({ description: 'Status of the draft' })
  @IsString()
  @IsNotEmpty()
  status!: string;
}

export class LedgerEntryDto implements LedgerEntry {
  @ApiProperty({ description: 'ERP Ledger ID' })
  @IsString()
  @IsNotEmpty()
  ledgerId!: string;

  @ApiProperty({ description: 'Amount as a decimal string' })
  @IsNumberString()
  @IsNotEmpty()
  amount!: string;

  @ApiProperty({ description: 'True if Debit, False if Credit' })
  @IsBoolean()
  isDebit!: boolean;
}

export class TransactionMetadataDto implements TransactionMetadata {
  @ApiPropertyOptional({ description: 'Validation errors found by Policy Engine', type: [String] })
  @IsArray()
  @IsOptional()
  validationErrors?: string[];
  
  @ApiProperty({ description: 'Audit version of the transaction' })
  @IsNotEmpty()
  auditVersion!: number;
}

export class CanonicalAccountingModelDto implements CanonicalAccountingModel {
  @ApiProperty({ type: () => TransactionHeaderDto })
  @ValidateNested()
  @Type(() => TransactionHeaderDto)
  header!: TransactionHeaderDto;

  @ApiPropertyOptional()
  @IsOptional()
  parties: any;

  @ApiProperty({ type: () => [LedgerEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LedgerEntryDto)
  ledgerEntries!: LedgerEntryDto[];

  @ApiProperty({ type: () => TransactionMetadataDto })
  @ValidateNested()
  @Type(() => TransactionMetadataDto)
  metadata!: TransactionMetadataDto;
}

export class UpdateDraftDto {
  @ApiProperty({ description: 'Expected version for optimistic locking' })
  @IsNotEmpty()
  currentVersion!: number;

  @ApiProperty({ type: () => CanonicalAccountingModelDto })
  @ValidateNested()
  @Type(() => CanonicalAccountingModelDto)
  payload!: CanonicalAccountingModelDto;
}

export class ActionDraftDto {
  @ApiProperty({ description: 'Expected version for optimistic locking' })
  @IsNotEmpty()
  currentVersion!: number;

  @ApiPropertyOptional({ description: 'Reason for the action' })
  @IsString()
  @IsOptional()
  reason?: string;
}
