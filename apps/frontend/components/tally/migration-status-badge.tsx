import * as React from "react"
import { cn } from "@/lib/utils"

export function MigrationStatusBadge({ status, className }: { status: string; className?: string }) {
  let colorClass = "bg-gray-100 text-gray-800 border-gray-200"

  switch (status?.toUpperCase()) {
    case "COMPLETED":
    case "SUCCESS":
      colorClass = "bg-green-100 text-green-800 border-green-200"
      break
    case "FAILED":
    case "ERROR":
      colorClass = "bg-red-100 text-red-800 border-red-200"
      break
    case "PENDING":
    case "RUNNING":
    case "IN_PROGRESS":
      colorClass = "bg-blue-100 text-blue-800 border-blue-200"
      break
    case "ROLLED_BACK":
    case "PARTIAL":
      colorClass = "bg-yellow-100 text-yellow-800 border-yellow-200"
      break
  }

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", colorClass, className)}>
      {status || "UNKNOWN"}
    </span>
  )
}
