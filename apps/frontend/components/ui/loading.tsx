import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export function LoadingSpinner({ className, size = 24 }: { className?: string, size?: number }) {
  return <Loader2 size={size} className={cn("animate-spin text-muted-foreground", className)} />
}

export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <LoadingSpinner size={48} />
      {message && <p className="mt-4 text-sm font-medium">{message}</p>}
    </div>
  )
}
