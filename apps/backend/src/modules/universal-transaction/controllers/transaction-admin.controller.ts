import { Controller, Get, Post, Delete, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { TransactionOutboxRepository } from '../repositories/transaction-outbox.repository';
import { AuditService } from '../../audit/audit.service';
import { Request } from '@nestjs/common';

@Controller('outbox')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ACCOUNTING_ADMIN', 'SYSTEM_ADMIN')
export class TransactionAdminController {
  constructor(
    private readonly outboxRepository: TransactionOutboxRepository,
    private readonly auditService: AuditService,
  ) {}

  @Get('dead')
  async getDeadLetters(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 50;
    return this.outboxRepository.findDeadLetters(skipNum, takeNum);
  }

  @Get('dead/:id')
  async getDeadLetter(@Param('id', ParseUUIDPipe) id: string) {
    return this.outboxRepository.getDeadLetterById(id);
  }

  @Post(':id/replay')
  async replayDeadLetter(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const result = await this.outboxRepository.replayDeadLetter(id);
    
    // Limitation: AuditLog creation isn't atomic with the repository mutation because AuditService
    // doesn't support Prisma transaction clients.
    await this.auditService.log({
      action: 'REPLAY_DEAD_LETTER',
      userId: req.user?.id || 'system',
      entity: 'TransactionOutbox',
      entityId: id,
      reason: 'Manual dead letter replay',
    });
    
    return result;
  }

  @Post('replay-all')
  async replayAllDeadLetters(@Request() req: any) {
    const count = await this.outboxRepository.replayAllDeadLetters();
    
    await this.auditService.log({
      action: 'BULK_REPLAY_DEAD_LETTERS',
      userId: req.user?.id || 'system',
      entity: 'TransactionOutbox',
      reason: `Bulk replayed ${count} dead letters`,
    });
    
    return { status: 'SUCCESS', count };
  }

  @Delete(':id')
  async deleteDeadLetter(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const result = await this.outboxRepository.deleteDeadLetter(id);
    
    await this.auditService.log({
      action: 'DELETE_DEAD_LETTER',
      userId: req.user?.id || 'system',
      entity: 'TransactionOutbox',
      entityId: id,
      reason: 'Manual dead letter deletion',
    });
    
    return result;
  }
}
