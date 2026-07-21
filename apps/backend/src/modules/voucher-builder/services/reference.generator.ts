import { Injectable } from '@nestjs/common';

@Injectable()
export class ReferenceGenerator {
  generateVoucherNumber(voucherType: string): string {
    const prefix = voucherType.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  }

  extractReferences(paymentData: any): { type: string; value: string }[] {
    const references = [];
    if (paymentData.transactionId)
      references.push({
        type: 'Transaction ID',
        value: paymentData.transactionId,
      });
    if (paymentData.utr)
      references.push({ type: 'UTR', value: paymentData.utr });
    return references;
  }
}
