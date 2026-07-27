"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { LoadingSkeleton } from "../LoadingSkeleton";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!token) {
      // In a real app, redirect to /login.
      // For this implementation, we will just simulate a logged-in admin user
      // if there's no token so the command center is usable for the demo.
      const { setAuth } = useAuthStore.getState();
      setAuth("demo-token", ["ACCOUNTING_ADMIN"], ["*"]);
    }
  }, [token, router]);

  if (!isMounted) {
    return (
      <div className="p-8">
        <LoadingSkeleton count={4} />
      </div>
    );
  }

  return <>{children}</>;
}
