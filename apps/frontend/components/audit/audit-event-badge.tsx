import * as React from "react"
import { cn } from "@/lib/utils"

export function AuditEventBadge({ result, className }: { result: string; className?: string }) {
  let colorClass = "bg-gray-100 text-gray-800 border-gray-200"

  switch (result?.toUpperCase()) {
    case "SUCCESS":
    case "COMPLETED":
      colorClass = "bg-green-100 text-green-800 border-green-200"
      break
    case "FAILED":
    case "ERROR":
      colorClass = "bg-red-100 text-red-800 border-red-200"
      break
    case "PENDING":
    case "IN_PROGRESS":
      colorClass = "bg-blue-100 text-blue-800 border-blue-200"
      break
    default:
      colorClass = "bg-gray-100 text-gray-800 border-gray-200"
  }

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", colorClass, className)}>
      {result || "UNKNOWN"}
    </span>
  )
}
