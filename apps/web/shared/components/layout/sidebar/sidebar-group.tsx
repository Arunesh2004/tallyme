/**
 * File: apps/web/shared/components/layout/sidebar/sidebar-group.tsx
 * Purpose: Renders a group of navigation items with an optional label.
 * Dependencies: React, framer-motion, shared/types/navigation, providers/shell-provider, utils/cn
 */

import React from 'react';
import { motion } from 'framer-motion';
import { NavigationGroup as NavigationGroupType } from '../../../types/navigation';
import { SidebarItem } from './sidebar-item';
import { useShell } from '../../../../providers/shell-provider';
import { cn } from '../../../utils/cn';

interface SidebarGroupProps {
  group: NavigationGroupType;
}

export function SidebarGroup({ group }: SidebarGroupProps) {
  const { isSidebarCollapsed } = useShell();

  // If there are no items to show, don't render the group
  if (!group.items || group.items.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 mb-6 px-3">
      {!isSidebarCollapsed && group.label && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="px-3 mb-1"
        >
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {group.label}
          </span>
        </motion.div>
      )}
      
      {/* Fallback for collapsed state group divider */}
      {isSidebarCollapsed && group.label && (
        <div className="flex justify-center mb-1 mt-2">
          <div className="w-4 h-px bg-gray-200" />
        </div>
      )}

      <ul className={cn(
        "flex flex-col m-0 p-0 list-none",
        isSidebarCollapsed ? "gap-2" : "gap-1"
      )}>
        {group.items.map((item) => (
          <li key={item.id}>
            <SidebarItem item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}
