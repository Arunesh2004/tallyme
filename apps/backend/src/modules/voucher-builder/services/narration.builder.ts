import { Injectable } from '@nestjs/common';

@Injectable()
export class NarrationBuilder {
  buildReceiptNarration(
    allocationData: any,
    paymentData: any,
    student: any,
  ): string[] {
    const mainNarration = `Fee received from Admission No. ${student.admissionNumber} via ${paymentData.gateway || 'Unknown'}. Transaction ID: ${paymentData.transactionId || 'N/A'}.`;
    return [mainNarration];
  }
}
