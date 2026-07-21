/**
 * File: apps/web/lib/auth/token.ts
 * Purpose: Manages JWT access tokens in memory (for XSS protection) and handles refresh logic.
 * Dependencies: axiosInstance
 */

import { axiosInstance } from '../api/axios';

// In-memory token storage (Do NOT store in localStorage for security)
let accessToken: string | null = null;

export const getAccessToken = () => accessToken;

export const setAccessToken = (token: string) => {
  accessToken = token;
};

export const clearTokens = () => {
  accessToken = null;
  // Note: HttpOnly refresh token cookie will be cleared by the backend /logout endpoint
};

/**
 * Attempts to refresh the access token using the HttpOnly refresh token cookie.
 */
export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    // The browser will automatically include the HttpOnly refresh token cookie
    const response = await axiosInstance.post('/auth/refresh');
    const { token } = response.data;
    
    setAccessToken(token);
    return token;
  } catch (error) {
    clearTokens();
    throw error;
  }
};
