"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

type User = { id: string; email: string; role: string };

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Session restoration
    const restoreSession = async () => {
      try {
        const res = await api.post("/auth/refresh");
        const { setAccessToken } = await import("@/lib/api");
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
      } catch (err) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();

    // Listen to global logout event from interceptor
    const handleLogout = () => logout();
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  const login = async (credentials: any) => {
    try {
      const res = await api.post("/auth/login", credentials);
      const { setAccessToken } = await import("@/lib/api");
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      router.push("/");
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.error(e);
    } finally {
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/login") {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!isAuthenticated && pathname !== "/login") return null;

  return <>{children}</>;
}
