import { IsString, IsNotEmpty } from 'class-validator';

export class ProcessVoucherDto {
  @IsString()
  @IsNotEmpty()
  feeAllocationCandidateId!: string;
}
