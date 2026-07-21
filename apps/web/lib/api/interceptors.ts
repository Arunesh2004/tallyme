/**
 * File: apps/web/lib/api/interceptors.ts
 * Purpose: Attaches request/response interceptors to Axios for token injection and refresh logic.
 * Dependencies: axios, lib/auth/token
 */

import { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, refreshAccessToken, clearTokens } from '../auth/token';

export function setupInterceptors(axiosInstance: AxiosInstance) {
  // Request Interceptor
  axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as any;

      // Handle 401 Unauthorized (Token Expired)
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const newToken = await refreshAccessToken();
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axiosInstance(originalRequest); // Retry original request
          }
        } catch (refreshError) {
          // Refresh token failed, force logout
          clearTokens();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
}
