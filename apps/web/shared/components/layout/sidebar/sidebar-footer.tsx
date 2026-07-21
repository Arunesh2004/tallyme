/**
 * File: apps/web/shared/components/layout/sidebar/sidebar-footer.tsx
 * Purpose: Renders the bottom section of the sidebar (e.g., App version, environment).
 * Dependencies: React, providers/shell-provider, framer-motion, utils/cn
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useShell } from '../../../../providers/shell-provider';
import { cn } from '../../../utils/cn';

export function SidebarFooter() {
  const { isSidebarCollapsed } = useShell();

  return (
    <div className={cn(
      "px-4 py-4 border-t border-gray-200 mt-auto",
      isSidebarCollapsed ? "flex justify-center px-2" : ""
    )}>
      {isSidebarCollapsed ? (
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
          v1
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col gap-1"
        >
          {/* Future User Summary / Sync Status Placeholder */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">TallyMe Enterprise</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
              v1.0
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
