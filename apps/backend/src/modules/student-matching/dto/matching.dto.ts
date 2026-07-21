import { IsString, IsNotEmpty } from 'class-validator';

export class ProcessMatchingDto {
  @IsString()
  @IsNotEmpty()
  paymentCandidateId!: string;
}
