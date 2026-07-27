import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "ACCOUNTING_ADMIN" | "APPROVER" | "AUDITOR" | "OPERATOR" | "VIEW_ONLY";

interface AuthState {
  token: string | null;
  roles: Role[];
  permissions: string[];
  setAuth: (token: string, roles: Role[], permissions: string[]) => void;
  logout: () => void;
  hasRole: (role: Role) => boolean;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      roles: [],
      permissions: [],
      setAuth: (token, roles, permissions) => set({ token, roles, permissions }),
      logout: () => set({ token: null, roles: [], permissions: [] }),
      hasRole: (role) => get().roles.includes(role) || get().roles.includes("ACCOUNTING_ADMIN"),
      hasPermission: (permission) => get().permissions.includes(permission),
    }),
    {
      name: "auth-storage",
    }
  )
);
