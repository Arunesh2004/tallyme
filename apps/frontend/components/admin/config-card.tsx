import * as React from "react"
import { cn } from "@/lib/utils"

export function ConfigCard({ label, description, children, className }: { label: string, description?: string, children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-3", className)}>
      <div>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label>
        {description && <p className="text-[0.8rem] text-muted-foreground mt-1">{description}</p>}
      </div>
      <div>
        {children}
      </div>
    </div>
  )
}
