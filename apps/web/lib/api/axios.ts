/**
 * File: apps/web/lib/api/axios.ts
 * Purpose: Configures the base Axios instance with default headers.
 * Dependencies: axios, config/env
 */

import axios from 'axios';
import { env } from '../../config/env';

export const axiosInstance = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Required for HttpOnly refresh tokens
});
