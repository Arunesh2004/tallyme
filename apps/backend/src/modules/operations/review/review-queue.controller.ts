import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ReviewQueueService } from './review-queue.service';

@Controller('operations/review-queue')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewQueueController {
  constructor(private readonly reviewQueueService: ReviewQueueService) {}

  @Get()
  @Roles('ACCOUNTING_ADMIN', 'APPROVER', 'OPERATOR')
  async getReviewQueue() {
    return this.reviewQueueService.getReviewQueue();
  }
}
