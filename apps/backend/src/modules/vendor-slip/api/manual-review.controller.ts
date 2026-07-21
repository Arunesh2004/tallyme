// src/modules/vendor-slip/api/manual-review.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../auth/guards/permissions.guard';

@Controller('manual-review')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ManualReviewController {
  @Get()
  @RequirePermissions('ManualReview.Read')
  async listReviews() {
    return { data: [] }; // Stub
  }

  @Get(':id')
  @RequirePermissions('ManualReview.Read')
  async getReview(@Param('id') id: string) {
    return { id, status: 'PENDING' }; // Stub
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ManualReview.Resolve')
  async approveReview(@Param('id') id: string) {
    // 1. Mark as Approved
    // 2. Publish event to continue pipeline
    return { id, status: 'APPROVED' };
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ManualReview.Resolve')
  async rejectReview(@Param('id') id: string) {
    return { id, status: 'REJECTED' };
  }
}
