'use client';

/**
 * File: apps/web/providers/index.ts
 * Purpose: Aggregates all global context providers into a single AppProvider wrapper.
 * Dependencies: React
 */

import React from 'react';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';
import { AuthProvider } from './auth-provider';
import { ToastProvider } from './toast-provider';
import { ShellProvider } from './shell-provider';

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <ShellProvider>
            {children}
            <ToastProvider />
          </ShellProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
