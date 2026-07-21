import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { MailListenerService } from '../services/mail-listener.service';
import { TriggerSyncDto } from '../dto/mail.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions } from '../../auth/authorization/decorators/permissions.decorator';
import { PermissionGuard } from '../../auth/authorization/guards/permission.guard';

@Controller('mail')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class MailController {
  constructor(private readonly mailListener: MailListenerService) {}

  @Post('sync')
  @Permissions('admin:mail:sync')
  async triggerSync(@Body() dto: TriggerSyncDto) {
    const processed = await this.mailListener.triggerSync();
    return { success: true, processed, source: dto.source };
  }
}
