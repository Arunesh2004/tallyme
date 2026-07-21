/**
 * File: apps/web/shared/constants/routes.ts
 * Purpose: Centralized registry defining every route, its metadata, and permissions.
 * Dependencies: shared/types/navigation, lib/auth/permissions
 */

import { RouteMetadata } from '../types/navigation';
import { Role } from '../../lib/auth/permissions';

export const APP_ROUTES: Record<string, RouteMetadata> = {
  DASHBOARD: {
    id: 'route.dashboard',
    title: 'Dashboard',
    description: 'High-level operational overview',
    href: '/',
    breadcrumbs: [{ label: 'Dashboard' }],
    layout: 'dashboard',
  },
  STUDENTS: {
    id: 'route.students',
    title: 'Students',
    description: 'Student directory and fee matching profiles',
    href: '/students',
    breadcrumbs: [{ label: 'Dashboard', href: '/' }, { label: 'Students' }],
    layout: 'dashboard',
  },
  PAYMENTS: {
    id: 'route.payments',
    title: 'Payments',
    description: 'Raw ledger of incoming payments',
    href: '/payments',
    breadcrumbs: [{ label: 'Dashboard', href: '/' }, { label: 'Payments' }],
    layout: 'dashboard',
  },
  MANUAL_REVIEW: {
    id: 'route.manualReview',
    title: 'Manual Review',
    description: 'Resolve automation exceptions',
    href: '/review',
    breadcrumbs: [{ label: 'Dashboard', href: '/' }, { label: 'Manual Review' }],
    layout: 'dashboard',
  },
  SYNC_MONITOR: {
    id: 'route.syncMonitor',
    title: 'Sync Monitor',
    description: 'Tally Prime sync connectivity and logs',
    href: '/sync',
    permission: { roles: [Role.SUPER_ADMIN, Role.ADMINISTRATOR] },
    breadcrumbs: [{ label: 'Dashboard', href: '/' }, { label: 'Sync Monitor' }],
    layout: 'dashboard',
  },
  REPORTS: {
    id: 'route.reports',
    title: 'Reports',
    description: 'Financial extracts and analytics',
    href: '/reports',
    permission: { roles: [Role.SUPER_ADMIN, Role.PRINCIPAL, Role.ACCOUNTANT] },
    breadcrumbs: [{ label: 'Dashboard', href: '/' }, { label: 'Reports' }],
    layout: 'dashboard',
  },
  SETTINGS: {
    id: 'route.settings',
    title: 'Settings',
    description: 'Application configuration',
    href: '/settings',
    permission: { roles: [Role.SUPER_ADMIN, Role.ADMINISTRATOR] },
    breadcrumbs: [{ label: 'Dashboard', href: '/' }, { label: 'Settings' }],
    layout: 'dashboard',
  },
} as const;
