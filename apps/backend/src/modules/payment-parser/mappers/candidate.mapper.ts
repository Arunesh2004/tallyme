import { Injectable } from '@nestjs/common';
import { PaymentCandidateDomain } from '../interfaces/parser.interfaces';
import { PaymentCandidate } from '@prisma/client';

@Injectable()
export class PaymentCandidateMapper {
  static toPrisma(
    domain: PaymentCandidateDomain & { isDuplicate: boolean },
  ): Omit<PaymentCandidate, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      gateway: domain.gateway,
      transactionId: domain.transactionId,
      utr: domain.utr,
      referenceNumber: domain.referenceNumber,
      amount: domain.amount as any, // Decimal translation
      currency: domain.currency,
      studentName: domain.studentName,
      admissionNumber: domain.admissionNumber,
      feeMonth: domain.feeMonth,
      feeYear: domain.feeYear,
      paymentDate: domain.paymentDate,
      emailId: domain.emailId,
      sender: domain.sender,
      subject: domain.subject,
      confidence: domain.confidence,
      missingFields: domain.missingFields,
      rawData: domain.rawData,
      isDuplicate: domain.isDuplicate,
    };
  }
}
