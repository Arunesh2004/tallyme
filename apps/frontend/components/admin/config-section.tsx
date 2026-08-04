import * as React from "react"
import { cn } from "@/lib/utils"

export function ConfigSection({ title, description, children, className }: { title: string, description?: string, children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("space-y-4 mb-8", className)}>
      <div>
        <h3 className="text-lg font-medium leading-6 text-foreground">{title}</h3>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {children}
      </div>
    </div>
  )
}
