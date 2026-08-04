import { IsString, IsUUID } from 'class-validator';

export class ReplayRequestDto {
  @IsString()
  @IsUUID()
  invoiceCandidateId!: string;
}
