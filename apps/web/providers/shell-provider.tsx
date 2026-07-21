'use client';

/**
 * File: apps/web/providers/shell-provider.tsx
 * Purpose: Manages UI state specific to the application shell (e.g. sidebar collapse, mobile drawer open).
 * Dependencies: React
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ShellContextType {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileDrawerOpen: boolean;
  setMobileDrawerOpen: (isOpen: boolean) => void;
}

const ShellContext = createContext<ShellContextType | undefined>(undefined);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  return (
    <ShellContext.Provider
      value={{
        isSidebarCollapsed,
        toggleSidebar,
        isMobileDrawerOpen,
        setMobileDrawerOpen,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  const context = useContext(ShellContext);
  if (context === undefined) {
    throw new Error('useShell must be used within a ShellProvider');
  }
  return context;
}
