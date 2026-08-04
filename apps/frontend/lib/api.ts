import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api/v1",
  withCredentials: true, // Send cookies like refresh_token
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor to attach JWT and CSRF
let cachedCsrfToken: string | null = null;
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

api.interceptors.request.use(
  async (config) => {
    // Attach JWT if available
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Only attach CSRF token for mutating requests
    if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
      if (!cachedCsrfToken) {
        try {
          const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || "/api/v1"}/auth/csrf`, {
            withCredentials: true,
          });
          cachedCsrfToken = response.data.csrfToken;
        } catch (error) {
          console.error("Failed to fetch CSRF token", error);
        }
      }
      if (cachedCsrfToken) {
        config.headers['X-CSRF-Token'] = cachedCsrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for global error handling & refresh token logic
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/logout') && !originalRequest.url?.includes('/auth/refresh')) {
      originalRequest._retry = true;
      try {
        // Attempt refresh
        const refreshResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || "/api/v1"}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        accessToken = refreshResponse.data.accessToken;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, auth store should log out
        window.dispatchEvent(new Event("auth:logout"));
        return Promise.reject(refreshError);
      }
    }
    
    // Global Error Handling
    if (error.response?.status >= 500) {
      console.error("Global Server Error:", error);
    }
    
    return Promise.reject(error);
  }
);
