import { IsUUID, IsString, MinLength } from 'class-validator';

export class VmmsReviewApproveDto {
  @IsUUID()
  invoiceCandidateId!: string;

  @IsUUID()
  vendorBranchId!: string;

  @IsString()
  @MinLength(10)
  comment!: string;
}
