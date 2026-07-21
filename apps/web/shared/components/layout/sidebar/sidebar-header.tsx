/**
 * File: apps/web/shared/components/layout/sidebar/sidebar-header.tsx
 * Purpose: Renders the logo, application name, and optional collapse toggle at the top of the sidebar.
 * Dependencies: React, framer-motion, lucide-react, providers/shell-provider, utils/cn
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';
import { useShell } from '../../../../providers/shell-provider';
import { cn } from '../../../utils/cn';
import { SidebarCollapse } from './sidebar-collapse';

export function SidebarHeader() {
  const { isSidebarCollapsed } = useShell();

  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-4 border-b border-gray-200",
      isSidebarCollapsed ? "justify-center px-2" : ""
    )}>
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="flex items-center justify-center min-w-[32px] h-8 rounded-md bg-blue-600 text-white">
          <Building2 size={18} />
        </div>
        {!isSidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="flex flex-col whitespace-nowrap"
          >
            <span className="font-semibold text-sm leading-tight text-gray-900">TallyMe</span>
            {/* Future organization placeholder */}
            <span className="text-xs text-gray-500">Global Org</span>
          </motion.div>
        )}
      </div>
      
      {!isSidebarCollapsed && (
        <div className="hidden lg:block">
          <SidebarCollapse />
        </div>
      )}
    </div>
  );
}
