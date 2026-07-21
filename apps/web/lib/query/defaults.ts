/**
 * File: apps/web/lib/query/defaults.ts
 * Purpose: Defines global default options for TanStack Query.
 * Dependencies: @tanstack/react-query
 */

import { DefaultOptions } from '@tanstack/react-query';

export const queryDefaults: DefaultOptions = {
  queries: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 401/403/404 errors
      if ([401, 403, 404].includes(error?.response?.status)) return false;
      return failureCount < 3;
    },
    refetchOnWindowFocus: false, // Prevents excessive API calls in enterprise forms
  },
};
