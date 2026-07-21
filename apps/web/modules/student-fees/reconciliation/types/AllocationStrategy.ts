import { FeeHead, FeeStructureItem } from '@prisma/client';

export interface AllocationContext {
  receivedAmount: number;
  expectedItems: (FeeStructureItem & { feeHead: FeeHead })[];
}

export interface AllocationResult {
  feeHeadId: string;
  expectedAmount: number;
  allocatedAmount: number;
  remainingAmount: number;
  priority: number;
}

export interface StrategyResult {
  allocations: AllocationResult[];
  unallocatedSurplus: number;
  totalAllocated: number;
}

export interface AllocationStrategy {
  allocate(context: AllocationContext): StrategyResult;
}
