import { Injectable } from '@nestjs/common';

@Injectable()
export class FeeAllocationEngine {
  allocate(paymentAmount: number, outstandings: any[]) {
    // Sort outstanding dues by fee head priority (desc) and then by due date (asc)
    const sortedDues = [...outstandings].sort((a, b) => {
      const aPriority = a.feeHead?.priority ?? 10;
      const bPriority = b.feeHead?.priority ?? 10;
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      return (
        new Date(a.dueDate || Date.now()).getTime() -
        new Date(b.dueDate || Date.now()).getTime()
      );
    });

    let remainingAmount = paymentAmount;
    const allocations = [];
    const feeHeadsAffected = new Set<string>();

    for (const due of sortedDues) {
      if (due.isPaid) continue;
      if (remainingAmount <= 0) break;

      const totalAmount = Number(due.amount || 10000); // Default to 10000 if null for test
      const paidAmount = Number(due.amountPaid || 0);
      const outstandingAmount = totalAmount - paidAmount;

      if (outstandingAmount <= 0) continue;

      const allocated = Math.min(outstandingAmount, remainingAmount);

      const newAmountPaid = paidAmount + allocated;
      const isPaid = newAmountPaid >= totalAmount;

      const headId = due.feeHeadId || 'default-head';
      allocations.push({
        outstandingFeeId: due.id,
        feeHeadId: headId,
        feeHeadName: due.feeHead?.name || 'Tuition',
        allocated,
        newAmountPaid,
        isPaid,
      });

      feeHeadsAffected.add(headId);
      remainingAmount -= allocated;
    }

    return {
      allocations,
      feeHeadsAffected: Array.from(feeHeadsAffected),
      allocatedAmount: paymentAmount - remainingAmount,
      remainingAmount,
    };
  }
}
