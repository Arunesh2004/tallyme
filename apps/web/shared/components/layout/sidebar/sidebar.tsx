/**
 * File: apps/web/shared/components/layout/sidebar/sidebar.tsx
 * Purpose: Main container for the application sidebar. Composes Header, Groups, and Footer.
 * Dependencies: React, framer-motion, shared/constants/navigation, providers/shell-provider, utils/cn
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShell } from '../../../../providers/shell-provider';
import { NAVIGATION_CONFIG } from '../../../constants/navigation';
import { cn } from '../../../utils/cn';
import { SidebarHeader } from './sidebar-header';
import { SidebarGroup } from './sidebar-group';
import { SidebarFooter } from './sidebar-footer';
import { usePathname } from 'next/navigation';

export function Sidebar() {
  const { isSidebarCollapsed, isMobileDrawerOpen, setMobileDrawerOpen } = useShell();
  const pathname = usePathname();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname, setMobileDrawerOpen]);

  // Sidebar content (shared between desktop and mobile)
  const SidebarContent = (
    <>
      <SidebarHeader />
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300" aria-label="Main Navigation">
        {NAVIGATION_CONFIG.map((group) => (
          <SidebarGroup key={group.id} group={group} />
        ))}
      </nav>
      <SidebarFooter />
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isSidebarCollapsed ? 64 : 256,
          transition: { duration: 0.2, ease: "easeOut" }
        }}
        className={cn(
          "hidden md:flex flex-col h-full bg-white border-r border-gray-200 z-20 flex-shrink-0"
        )}
      >
        {SidebarContent}
      </motion.aside>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setMobileDrawerOpen(false)}
              aria-hidden="true"
            />
            
            {/* Mobile Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-50 flex flex-col md:hidden"
              // In a real app we'd trap focus here for accessibility
            >
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
