import { IsString, IsNotEmpty } from 'class-validator';

export class TriggerSyncDto {
  @IsString()
  @IsNotEmpty()
  source!: string;
}
