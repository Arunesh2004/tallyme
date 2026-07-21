/**
 * File: apps/web/lib/query/client.ts
 * Purpose: Factory for creating the TanStack Query client.
 * Dependencies: @tanstack/react-query
 */

import { QueryClient } from '@tanstack/react-query';
import { queryDefaults } from './defaults';

let browserQueryClient: QueryClient | undefined = undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: queryDefaults,
  });
}

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
