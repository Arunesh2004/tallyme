'use client';

/**
 * File: apps/web/providers/theme-provider.tsx
 * Purpose: Provides light/dark theme context.
 * Dependencies: next-themes (stubbed here to avoid immediate dependency installation errors if not present)
 */

import React from 'react';

// In a real implementation, we would import ThemeProvider from 'next-themes'
// For this foundation layer, we establish the wrapper structure.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
