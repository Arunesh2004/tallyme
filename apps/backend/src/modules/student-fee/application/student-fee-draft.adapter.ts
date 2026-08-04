import { Injectable } from '@nestjs/common';
import {
  CanonicalAccountingModel,
} from '../../universal-transaction/domain/types';
import { TransactionIntent } from '../../universal-transaction/domain/enums';

@Injectable()
export class StudentFeeDraftAdapter {
  map(payload: any, candidateId: string): CanonicalAccountingModel {
    const {
      companyId,
      allocationData,
      paymentData,
      student,
    } = payload;

    const ledgerEntries = [];
    
    // Debit entry for the bank
    if (paymentData?.bankLedger && paymentData?.amount > 0) {
      ledgerEntries.push({
        ledgerId: paymentData.bankLedger,
        amount: String(paymentData.amount),
        isDebit: true,
      });
    }

    // Credit entries for allocations
    if (allocationData?.allocationBreakdown) {
      for (const alloc of allocationData.allocationBreakdown) {
        if (alloc.allocated > 0) {
          ledgerEntries.push({
            ledgerId: alloc.feeHeadName,
            amount: String(alloc.allocated),
            isDebit: false,
          });
        }
      }
    }

    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const fy = month < 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`;

    return {
      header: {
        tenantId: 'default',
        transactionIntent: TransactionIntent.RECEIPT,
        voucherType: payload.voucherType || 'Receipt',
        companyId: companyId,
        financialYear: fy,
        currency: 'INR',
        exchangeRate: '1.0',
        status: 'DRAFT',
        invoiceDate: date.toISOString().split('T')[0], // yyyy-mm-dd
        referenceNumbers: paymentData?.reference ? [paymentData.reference] : [],
        narration: `Being fee received from ${student?.name || 'Student'} vide Ref: ${paymentData?.reference || 'N/A'}`,
      },
      parties: {
        customerId: student?.name, // Use name for now
      },
      ledgerEntries,
      metadata: {
        auditVersion: 1,
        documentHash: candidateId,
      },
    };
  }
}
