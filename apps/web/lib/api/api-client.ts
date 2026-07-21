/**
 * File: apps/web/lib/api/api-client.ts
 * Purpose: Provides the configured, ready-to-use API client with interceptors attached.
 * Dependencies: axiosInstance, setupInterceptors
 */

import { axiosInstance } from './axios';
import { setupInterceptors } from './interceptors';

// Attach interceptors to the instance
setupInterceptors(axiosInstance);

export const apiClient = axiosInstance;
