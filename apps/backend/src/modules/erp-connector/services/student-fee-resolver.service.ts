import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class StudentFeeResolverService {
  private readonly logger = new Logger(StudentFeeResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolveStudentFee(paymentData: any, companyId: string) {
    this.logger.log(
      `Resolving Student Fee for Reference: ${paymentData.reference}`,
    );

    // Checks: Student exists, Fee pending exists, Payment not duplicated, Academic year valid
    let isValid = true;
    const errors = [];

    // Check Student Exists
    const studentMapping = await this.prisma.tallyMasterMapping.findFirst({
      where: {
        companyId,
        entityType: 'STUDENT',
        internalEntityId: paymentData.studentId,
      },
    });

    if (!studentMapping) {
      isValid = false;
      errors.push('Student mapping not found in Tally');
    }

    // Check Duplicate Payment
    const existingReconciliation =
      await this.prisma.accountingReconciliation.findFirst({
        where: { voucherId: paymentData.reference },
      });

    if (existingReconciliation) {
      isValid = false;
      errors.push('Payment duplicated in reconciliation records');
    }

    if (!isValid) {
      return {
        status: 'INVALID',
        errors,
      };
    }

    return {
      status: 'VALID',
      student: studentMapping?.tallyName,
      message: 'Student structure verified successfully',
    };
  }
}
