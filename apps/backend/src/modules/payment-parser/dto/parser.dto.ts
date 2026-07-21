import { IsString, IsNotEmpty } from 'class-validator';

export class ProcessEmailRequestDto {
  @IsString()
  @IsNotEmpty()
  emailId!: string;
}
