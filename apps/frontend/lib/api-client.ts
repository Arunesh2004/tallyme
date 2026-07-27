import { useAuthStore } from "@/store/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface RequestConfig extends RequestInit {
  data?: any;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
}

export class ApiClient {
  static get token() {
    return useAuthStore.getState().token;
  }

  static async request<T = any>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const { data, headers, ...customConfig } = config;
    let token = this.token;

    const buildConfig = (accessToken: string | null): RequestInit => {
      const requestHeaders: HeadersInit = {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      };

      const configWithDefaults: RequestInit = {
        ...customConfig,
        headers: requestHeaders,
        credentials: "include", // Essential for HttpOnly refresh token
      };

      if (data) {
        configWithDefaults.body = JSON.stringify(data);
      }

      return configWithDefaults;
    };

    const url = `${API_URL}${endpoint}`;
    
    try {
      let response = await fetch(url, buildConfig(token));
      
      // 401 Unauthorized handling (token expired)
      if (response.status === 401 && endpoint !== "/auth/login" && endpoint !== "/auth/refresh") {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            // Attempt refresh
            const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
            });
            
            if (!refreshResponse.ok) {
              throw new Error("Refresh failed");
            }
            
            const refreshData = await refreshResponse.json();
            const newToken = refreshData.accessToken;
            
            useAuthStore.getState().setAuth(newToken, useAuthStore.getState().roles, useAuthStore.getState().permissions);
            
            isRefreshing = false;
            onRefreshed(newToken);
            
            // Replay the failed request
            response = await fetch(url, buildConfig(newToken));
          } catch (refreshErr) {
            isRefreshing = false;
            refreshSubscribers = [];
            useAuthStore.getState().logout();
            throw new Error("Session expired. Please log in again.");
          }
        } else {
          // Wait for the ongoing refresh to complete
          return new Promise<T>((resolve, reject) => {
            refreshSubscribers.push(async (newToken: string) => {
              try {
                const retryResponse = await fetch(url, buildConfig(newToken));
                if (!retryResponse.ok) throw new Error("Retry failed");
                resolve(await retryResponse.json());
              } catch (err) {
                reject(err);
              }
            });
          });
        }
      }

      if (!response.ok) {
        let errorMessage = "An error occurred with the API request.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Response is not JSON
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error(`[API Error] ${endpoint}:`, error);
      throw error;
    }
  }

  static get<T>(endpoint: string, config?: RequestConfig) {
    return this.request<T>(endpoint, { ...config, method: "GET" });
  }

  static post<T>(endpoint: string, data?: any, config?: RequestConfig) {
    return this.request<T>(endpoint, { ...config, method: "POST", data });
  }

  static patch<T>(endpoint: string, data?: any, config?: RequestConfig) {
    return this.request<T>(endpoint, { ...config, method: "PATCH", data });
  }

  static delete<T>(endpoint: string, config?: RequestConfig) {
    return this.request<T>(endpoint, { ...config, method: "DELETE" });
  }
}
