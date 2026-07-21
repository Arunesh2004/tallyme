/**
 * File: apps/web/shared/types/navigation.ts
 * Purpose: Defines strongly typed interfaces for the global navigation and routing systems.
 * Dependencies: lib/auth/permissions (Role enum)
 */

import { Role } from '../../lib/auth/permissions';
import { ForwardRefExoticComponent, RefAttributes } from 'react';
import { LucideProps } from 'lucide-react';

export type NavigationIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

export interface NavigationVisibility {
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

export interface NavigationPermission {
  roles?: Role[];
  featureFlag?: string;
}

export interface NavigationBadge {
  text: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
}

export interface RouteMetadata {
  id: string;
  title: string;
  description: string;
  href: string;
  permission?: NavigationPermission;
  breadcrumbs: { label: string; href?: string }[];
  layout?: 'dashboard' | 'auth' | 'full';
  icon?: NavigationIcon;
  featureFlag?: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: NavigationIcon;
  permission?: NavigationPermission;
  visibility?: NavigationVisibility;
  featureFlag?: string;
  badge?: NavigationBadge;
  disabled?: boolean;
  hidden?: boolean;
  external?: boolean;
  children?: NavigationItem[];
}

export interface NavigationGroup {
  id: string;
  label?: string;
  items: NavigationItem[];
}
