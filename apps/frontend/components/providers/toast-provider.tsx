"use client";

// Generic simple Toast placeholder. In production, this would use a library like Sonner.
import React, { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

interface Toast {
  id: string;
  title: string;
  message?: string;
  type?: "default" | "success" | "error";
}

interface ToastContextType {
  toast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
        {toasts.map((t) => (
          <div 
            key={t.id} 
            className={cn(
              "px-4 py-3 rounded shadow-md text-sm font-medium w-72 transition-all",
              t.type === "error" ? "bg-destructive text-destructive-foreground" : "bg-card text-foreground border"
            )}
          >
            <div>{t.title}</div>
            {t.message && <div className="text-xs opacity-90 mt-1">{t.message}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
};
