'use client';

/**
 * File: apps/web/providers/auth-provider.tsx
 * Purpose: Context provider for global authentication state.
 * Dependencies: React
 */

import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState] = useState({ isAuthenticated: false, user: null });

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
