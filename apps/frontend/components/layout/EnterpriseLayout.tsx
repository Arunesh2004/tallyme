"use client";

import { ProtectedRoute } from "../auth/ProtectedRoute";
import { EnterpriseSidebar } from "./EnterpriseSidebar";
import { TopNavbar } from "./TopNavbar";

export function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-background">
        <EnterpriseSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopNavbar />
          <main className="flex-1 overflow-y-auto bg-muted/30 p-8">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
