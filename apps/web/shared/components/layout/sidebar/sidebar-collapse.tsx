/**
 * File: apps/web/shared/components/layout/sidebar/sidebar-collapse.tsx
 * Purpose: Renders the button used to collapse/expand the sidebar.
 * Dependencies: React, lucide-react, providers/shell-provider
 */

import React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useShell } from '../../../../providers/shell-provider';

export function SidebarCollapse() {
  const { isSidebarCollapsed, toggleSidebar } = useShell();

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className="p-1.5 text-gray-500 rounded-md hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
    </button>
  );
}
