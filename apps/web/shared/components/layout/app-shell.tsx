/**
 * File: apps/web/shared/components/layout/app-shell.tsx
 * Purpose: Composes the root application layout structure (Sidebar, Topbar, Main Content).
 * Dependencies: React
 */

import React from 'react';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* 
        Implementation Note: 
        Sidebar and Topbar composition will be added in Phase 2B. 
        This is the structural wrapper strictly adhering to Phase 2A requirements.
      */}
      
      {/* 
        <Sidebar /> 
      */}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 
          <Topbar /> 
        */}

        <main className="flex-1 overflow-y-auto outline-none" tabIndex={-1} id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
