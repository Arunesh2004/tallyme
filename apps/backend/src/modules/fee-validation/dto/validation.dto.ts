import { IsString, IsNotEmpty } from 'class-validator';

export class ProcessValidationDto {
  @IsString()
  @IsNotEmpty()
  studentPaymentCandidateId!: string;
}
