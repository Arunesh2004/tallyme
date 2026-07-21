/**
 * File: apps/web/lib/query/keys.ts
 * Purpose: Centralized factory for TanStack Query keys to prevent typos and enforce consistency.
 * Dependencies: None
 */

export const queryKeys = {
  students: {
    all: ['students'] as const,
    lists: () => [...queryKeys.students.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.students.lists(), { filters }] as const,
    details: () => [...queryKeys.students.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.students.details(), id] as const,
  },
  payments: {
    all: ['payments'] as const,
  },
  manualReview: {
    all: ['manual-review'] as const,
  },
  sync: {
    all: ['sync'] as const,
  },
} as const;
