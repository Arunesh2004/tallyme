import { Injectable } from '@nestjs/common';

@Injectable()
export class FeeAllocationEngine {
  allocate(paymentAmount: number, outstandings: any[]) {
    // Sort outstanding dues by fee head priority (desc) and then by due date (asc)
    const sortedDues = [...outstandings].sort((a, b) => {
      if (a.feeHead.priority !== b.feeHead.priority) {
        return b.feeHead.priority - a.feeHead.priority;
      }
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    let remainingAmount = paymentAmount;
    const allocations = [];
    const feeHeadsAffected = new Set<string>();

    for (const due of sortedDues) {
      if (due.isPaid) continue;
      if (remainingAmount <= 0) break;

      const totalAmount = Number(due.amount);
      const paidAmount = Number(due.amountPaid || 0);
      const outstandingAmount = totalAmount - paidAmount;

      if (outstandingAmount <= 0) continue;

      const allocated = Math.min(outstandingAmount, remainingAmount);

      const newAmountPaid = paidAmount + allocated;
      const isPaid = newAmountPaid >= totalAmount;

      allocations.push({
        outstandingFeeId: due.id,
        feeHeadId: due.feeHeadId,
        feeHeadName: due.feeHead.name,
        allocated,
        newAmountPaid,
        isPaid,
      });

      feeHeadsAffected.add(due.feeHeadId);
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
