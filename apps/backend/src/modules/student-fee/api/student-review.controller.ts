// src/modules/student-fee/api/student-review.controller.ts
import { Controller, Get, Post, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../../auth/guards/permissions.guard';

@Controller('student-fees/manual-review')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StudentManualReviewController {
  
  @Get()
  @RequirePermissions('StudentFee.Read')
  async listReviews() {
    return { data: [] }; // Stub
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('StudentFee.Resolve')
  async approveReview(@Param('id') id: string) {
    // Validates manually corrected match and proceeds to allocation
    return { id, status: 'APPROVED' };
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('StudentFee.Resolve')
  async rejectReview(@Param('id') id: string) {
    return { id, status: 'REJECTED' };
  }
}

@Controller('student-fees/allocations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FeeAllocationController {
  @Get(':id')
  @RequirePermissions('StudentFee.Read')
  async getAllocation(@Param('id') id: string) {
    return { id, status: 'ALLOCATED' };
  }
}
