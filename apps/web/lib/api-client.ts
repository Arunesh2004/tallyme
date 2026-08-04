// apps/web/lib/api-client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  if (!csrfTokenPromise) {
    csrfTokenPromise = axios.get(`${apiClient.defaults.baseURL}/auth/csrf`, { withCredentials: true })
      .then(res => {
        csrfToken = res.data.csrfToken;
        return csrfToken as string;
      })
      .catch(() => {
        csrfTokenPromise = null;
        return '';
      });
  }
  return csrfTokenPromise;
}

apiClient.interceptors.request.use(
  async (config) => {
    const method = config.method?.toLowerCase();
    if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
      const token = await getCsrfToken();
      if (token && config.headers) {
        config.headers['csrf-token'] = token;
      }
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const res = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, { refreshToken });
        const { accessToken } = res.data;
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
