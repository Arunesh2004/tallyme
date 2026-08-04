import { IsString, IsUUID, IsIn, IsOptional } from 'class-validator';

export const MismatchVerdict = [
  'LEGACY_CORRECT',
  'VMMS_CORRECT',
  'BOTH_WRONG',
] as const;
export type MismatchVerdictType = (typeof MismatchVerdict)[number];

export class ResolveMismatchDto {
  @IsUUID()
  invoiceId!: string;

  @IsString()
  @IsIn(MismatchVerdict)
  verdict!: MismatchVerdictType;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  proposedAlias?: string;
}

export class CreateAliasDto {
  @IsUUID()
  vendorLedgerId!: string;

  @IsString()
  aliasText!: string;

  @IsUUID()
  @IsOptional()
  invoiceIdContext?: string;
}
