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

  @IsBoolean()
  isDebit!: boolean;

  @IsBoolean()
  isParty!: boolean;

  @IsNumber()
  amount!: number;
}

export class TallyVoucherDTO {
  @IsString()
  @IsNotEmpty()
  voucherNumber!: string;

  @IsString()
  @IsNotEmpty()
  date!: string;

  @IsString()
  @IsNotEmpty()
  voucherType!: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  narration?: string;

  @IsString()
  @IsOptional()
  partyLedgerName?: string;

  @IsBoolean()
  @IsOptional()
  isEdit?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(2)
  @Type(() => TallyLedgerEntryDTO)
  lines!: TallyLedgerEntryDTO[];
}
