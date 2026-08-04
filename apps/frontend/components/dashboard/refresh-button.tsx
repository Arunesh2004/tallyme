"use client"

import * as React from "react"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

export function RefreshButton({
  isRefreshing,
  onRefresh,
  className
}: {
  isRefreshing?: boolean
  onRefresh: () => void
  className?: string
}) {
  return (
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50",
        className
      )}
      aria-label="Refresh data"
    >
      <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
      Refresh
    </button>
  )
}
