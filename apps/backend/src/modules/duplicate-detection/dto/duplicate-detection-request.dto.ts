import { IsString, IsNotEmpty, IsOptional, IsNumberString, IsDateString } from 'class-validator';

export class DuplicateDetectionRequest {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsOptional()
  vendorId?: string;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @IsNumberString()
  @IsOptional()
  amount?: string;

  @IsString()
  @IsOptional()
  documentHash?: string;
}
