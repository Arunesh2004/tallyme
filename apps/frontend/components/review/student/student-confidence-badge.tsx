import * as React from "react"
import { cn } from "@/lib/utils"

export function StudentConfidenceBadge({ score, className }: { score: number, className?: string }) {
  let colorClass = "bg-green-100 text-green-800 border-green-200"
  let label = "High"

  if (score < 50) {
    colorClass = "bg-red-100 text-red-800 border-red-200"
    label = "Low"
  } else if (score < 80) {
    colorClass = "bg-yellow-100 text-yellow-800 border-yellow-200"
    label = "Medium"
  }

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", colorClass, className)}>
      {label} ({score}%)
    </span>
  )
}
