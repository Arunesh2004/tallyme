"use client";

import * as React from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

export function Header() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="text-lg font-semibold lg:hidden">TallyMe</div>
      <div className="hidden lg:block"></div>
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-full hover:bg-muted"
          aria-label="Toggle Theme"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
          A
        </div>
      </div>
    </header>
  );
}
