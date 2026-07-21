/**
 * File: apps/web/shared/components/layout/sidebar/sidebar-item.tsx
 * Purpose: Renders an individual navigation link in the sidebar with active state and badge support.
 * Dependencies: React, next/link, next/navigation, framer-motion, utils/cn, shared/types/navigation, providers/shell-provider
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { NavigationItem } from '../../../types/navigation';
import { useShell } from '../../../../providers/shell-provider';
import { cn } from '../../../utils/cn';

interface SidebarItemProps {
  item: NavigationItem;
}

export function SidebarItem({ item }: SidebarItemProps) {
  const pathname = usePathname();
  const { isSidebarCollapsed, setMobileDrawerOpen } = useShell();

  // Basic active state check. In a real app, this might need to handle nested routes more gracefully.
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  if (item.hidden) return null;

  return (
    <Link
      href={item.href}
      onClick={() => setMobileDrawerOpen(false)} // Close drawer on mobile click
      target={item.external ? '_blank' : undefined}
      rel={item.external ? 'noopener noreferrer' : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md transition-colors group relative outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        isSidebarCollapsed ? "justify-center" : "",
        item.disabled ? "opacity-50 pointer-events-none" : "",
        isActive 
          ? "bg-blue-50 text-blue-700 font-medium" 
          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
      )}
      aria-current={isActive ? 'page' : undefined}
      aria-disabled={item.disabled}
      title={isSidebarCollapsed ? item.label : undefined}
    >
      {Icon && (
        <Icon 
          size={18} 
          className={cn(
            "flex-shrink-0 transition-colors",
            isActive ? "text-blue-600" : "text-gray-500 group-hover:text-gray-900"
          )} 
        />
      )}
      
      {!isSidebarCollapsed && (
        <motion.span
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 'auto' }}
          exit={{ opacity: 0, width: 0 }}
          className="flex-1 truncate"
        >
          {item.label}
        </motion.span>
      )}

      {!isSidebarCollapsed && item.badge && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0",
            item.badge.variant === 'destructive' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
          )}
        >
          {item.badge.text}
        </motion.span>
      )}

      {/* Tooltip for collapsed state would go here using a TooltipProvider from shadcn in the future */}
    </Link>
  );
}
