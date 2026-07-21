import { MappingProfile } from './MappingProfile';
import { RawAccountingTransaction, RawAccountingEntry } from '../types/AccountingDTOs';

export class StudentFeeMappingProfile implements MappingProfile {
  
  public map(eventPayload: any, sourceEventId: string): RawAccountingTransaction {
    const feeTransaction = eventPayload;
    const entries: RawAccountingEntry[] = [];
    
    // 1. Debit the Bank/Cash Ledger for the total received amount
    entries.push({
      mappingKey: feeTransaction.gateway ? `BANK_${feeTransaction.gateway.toUpperCase()}` : 'BANK_DEFAULT',
      debit: Number(feeTransaction.receivedAmount),
      credit: 0,
      narration: `Fee Payment Received. UTR: ${feeTransaction.utr || 'N/A'}`
    });

    // 2. Credit the specific Fee Income Ledgers
    for (const allocation of feeTransaction.allocations) {
      if (Number(allocation.allocatedAmount) > 0) {
        // We assume the mappingKey for fee heads is FEE_HEAD_{type}
        // e.g. FEE_HEAD_TUITION, FEE_HEAD_TRANSPORT, FEE_HEAD_ADVANCE
        // In a real system, we might use feeHead.type which is injected into the payload by the reconciler.
        // For simplicity, we assume the reconciler passes the feeHead type along with the allocation.
        
        const feeHeadType = allocation.feeHead?.type || 'UNKNOWN';
        
        entries.push({
          mappingKey: `FEE_HEAD_${feeHeadType.toUpperCase()}`,
          debit: 0,
          credit: Number(allocation.allocatedAmount),
          narration: `Allocation against ${feeHeadType}`
        });
      }
    }

    return {
      referenceId: feeTransaction.id,
      referenceType: 'FEE_RECEIPT',
      transactionDate: new Date(feeTransaction.paymentDate),
      description: `Student Fee Receipt for ${feeTransaction.studentId}`,
      voucherType: 'RECEIPT', // Maps to Tally's Receipt Voucher
      sourceEventId,
      entries
    };
  }
}
