/**
 * File: apps/web/shared/constants/navigation.ts
 * Purpose: Builds the complete, configuration-driven navigation tree using the Route Registry.
 * Dependencies: shared/constants/routes, shared/types/navigation, lucide-react
 */

import { NavigationGroup } from '../types/navigation';
import { APP_ROUTES } from './routes';
// We import icons here to keep the sidebar purely configuration-driven
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  AlertTriangle, 
  Activity, 
  BarChart3, 
  Settings 
} from 'lucide-react';

export const NAVIGATION_CONFIG: NavigationGroup[] = [
  {
    id: 'group.main',
    items: [
      {
        id: APP_ROUTES.DASHBOARD.id,
        label: APP_ROUTES.DASHBOARD.title,
        href: APP_ROUTES.DASHBOARD.href,
        icon: LayoutDashboard,
        permission: APP_ROUTES.DASHBOARD.permission,
      },
      {
        id: APP_ROUTES.STUDENTS.id,
        label: APP_ROUTES.STUDENTS.title,
        href: APP_ROUTES.STUDENTS.href,
        icon: Users,
        permission: APP_ROUTES.STUDENTS.permission,
      },
      {
        id: APP_ROUTES.PAYMENTS.id,
        label: APP_ROUTES.PAYMENTS.title,
        href: APP_ROUTES.PAYMENTS.href,
        icon: CreditCard,
        permission: APP_ROUTES.PAYMENTS.permission,
      },
    ],
  },
  {
    id: 'group.operations',
    label: 'Operations',
    items: [
      {
        id: APP_ROUTES.MANUAL_REVIEW.id,
        label: APP_ROUTES.MANUAL_REVIEW.title,
        href: APP_ROUTES.MANUAL_REVIEW.href,
        icon: AlertTriangle,
        permission: APP_ROUTES.MANUAL_REVIEW.permission,
        // Badge is just an example of configuration-driven state
        // In reality, this might be dynamically hydrated by a React Context later
        badge: { text: '0', variant: 'default' },
      },
      {
        id: APP_ROUTES.SYNC_MONITOR.id,
        label: APP_ROUTES.SYNC_MONITOR.title,
        href: APP_ROUTES.SYNC_MONITOR.href,
        icon: Activity,
        permission: APP_ROUTES.SYNC_MONITOR.permission,
      },
    ],
  },
  {
    id: 'group.system',
    label: 'System',
    items: [
      {
        id: APP_ROUTES.REPORTS.id,
        label: APP_ROUTES.REPORTS.title,
        href: APP_ROUTES.REPORTS.href,
        icon: BarChart3,
        permission: APP_ROUTES.REPORTS.permission,
      },
      {
        id: APP_ROUTES.SETTINGS.id,
        label: APP_ROUTES.SETTINGS.title,
        href: APP_ROUTES.SETTINGS.href,
        icon: Settings,
        permission: APP_ROUTES.SETTINGS.permission,
      },
    ],
  },
];
