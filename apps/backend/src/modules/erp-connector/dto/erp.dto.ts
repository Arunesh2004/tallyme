import { IsString, IsNotEmpty } from 'class-validator';

export class ProcessERPSyncDto {
  @IsString()
  @IsNotEmpty()
  voucherCandidateId!: string;
}
