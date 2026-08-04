import * as React from "react"
import { cn } from "@/lib/utils"

export function MetricTile({
  label,
  value,
  trend,
  className
}: {
  label: string
  value: string | number
  trend?: { value: string | number; label?: string; direction?: 'up' | 'down' | 'neutral' }
  className?: string
}) {
  return (
    <div className={cn("p-4 border rounded-lg bg-card text-card-foreground shadow-sm", className)}>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-3xl font-bold">{value}</div>
        {trend && (
          <div className={cn(
            "text-xs font-medium",
            trend.direction === 'up' ? "text-green-500" : 
            trend.direction === 'down' ? "text-red-500" : "text-muted-foreground"
          )}>
            {trend.value} {trend.label}
          </div>
        )}
      </div>
    </div>
  )
}
