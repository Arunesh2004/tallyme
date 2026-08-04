import {
  Controller,
  Post,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { VmmsReviewService } from '../application/vmms-review.service';
import { VmmsReviewApproveDto } from './dto/vmms-review.dto';

@Controller('vmms/review')
export class VmmsReviewController {
  constructor(private readonly vmmsReviewService: VmmsReviewService) {}

  @Post('approve')
  @HttpCode(HttpStatus.CREATED)
  public async approve(@Req() req: any) {
    console.log('--- VENDOR MANUAL REVIEW APPROVAL ---');
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    console.log('Authenticated User:', req.user);

    const body = req.body;

    console.log('Fields Extracted:');
    console.log('invoiceCandidateId:', body.invoiceCandidateId);
    console.log('vendorBranchId:', body.vendorBranchId);
    console.log('comment:', body.comment);

    // Manual Validation
    const dto = new VmmsReviewApproveDto();
    dto.invoiceCandidateId = body.invoiceCandidateId;
    dto.vendorBranchId = body.vendorBranchId;
    dto.comment = body.comment;

    const errors = await validate(dto);
    if (errors.length > 0) {
      console.error('Validation Errors:', errors);
      throw new BadRequestException(errors);
    }

    console.log('Validation passed, passing to service...');
    // We assume the user making this call has been authenticated in a real app.
    // For this architecture exercise, we'll pass a dummy 'admin-user' ID.
    return this.vmmsReviewService.approve(body, req.user?.id || 'admin-user');
  }
}
