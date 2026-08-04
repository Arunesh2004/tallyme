import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetMismatchesQueryDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class GetSummaryQueryDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class SummaryResponseDto {
  totalInvoices!: number;
  legacyMatches!: number;
  vmmsMatches!: number;
  agreementRate!: number;
  disagreementRate!: number;
  stage1MatchRate!: number;
  stage2MatchRate!: number;
  noMatchRate!: number;
  averageLatencyMs!: number;
  p95LatencyMs!: number;
  shadowFailures!: number;
  dualWriteRate!: number;
}
