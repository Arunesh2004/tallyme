import { AllocationStrategy, AllocationContext, StrategyResult, AllocationResult } from '../../types/AllocationStrategy';

export class WaterfallAllocationStrategy implements AllocationStrategy {
  
  public allocate(context: AllocationContext): StrategyResult {
    // 1. Sort items by priority (lower number = higher priority)
    const sortedItems = [...context.expectedItems].sort((a, b) => {
      const priorityA = a.feeHead?.priority ?? 999;
      const priorityB = b.feeHead?.priority ?? 999;
      return priorityA - priorityB;
    });

    let remainingFunds = context.receivedAmount;
    const allocations: AllocationResult[] = [];
    let totalAllocated = 0;

    // 2. Cascade funds through the priority buckets
    for (const item of sortedItems) {
      const expected = Number(item.amount);
      let allocated = 0;

      if (remainingFunds >= expected) {
        // Fully fund this head
        allocated = expected;
        remainingFunds -= expected;
      } else if (remainingFunds > 0) {
        // Partially fund this head
        allocated = remainingFunds;
        remainingFunds = 0;
      }

      totalAllocated += allocated;
      
      allocations.push({
        feeHeadId: item.feeHeadId,
        expectedAmount: expected,
        allocatedAmount: allocated,
        remainingAmount: expected - allocated,
        priority: item.feeHead?.priority ?? 999
      });
    }

    return {
      allocations,
      unallocatedSurplus: remainingFunds, // This will become ADVANCE
      totalAllocated
    };
  }
}
