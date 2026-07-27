"use client";

import { useAuthStore, Role } from "@/store/auth";

interface PermissionGateProps {
  role?: Role;
  permission?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ role, permission, children, fallback = null }: PermissionGateProps) {
  const hasRole = useAuthStore((state) => state.hasRole);
  const hasPermission = useAuthStore((state) => state.hasPermission);

  let isAllowed = true;

  if (role && !hasRole(role)) {
    isAllowed = false;
  }

  if (permission && !hasPermission(permission)) {
    isAllowed = false;
  }

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
