import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VmmsReplayService } from '../application/vmms-replay.service';
import { ReplayRequestDto } from './dto/vmms-replay.dto';

@Controller('vmms/replay')
export class VmmsReplayController {
  constructor(private readonly replayService: VmmsReplayService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  public async simulate(@Body() body: ReplayRequestDto) {
    const result = await this.replayService.replayInvoice(
      body.invoiceCandidateId,
    );
    return result;
  }
}
