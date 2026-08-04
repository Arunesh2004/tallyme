import * as React from "react"
import { cn } from "@/lib/utils"

export function ERPStatusBadge({ status, className }: { status: string; className?: string }) {
  let colorClass = "bg-gray-100 text-gray-800 border-gray-200"

  switch (status) {
    case "ONLINE":
    case "SYNCED":
    case "COMPLETED":
      colorClass = "bg-green-100 text-green-800 border-green-200"
      break
    case "FAILED_PERMANENT":
    case "FAILED":
      colorClass = "bg-red-100 text-red-800 border-red-200"
      break
    case "SYNCING":
    case "PENDING":
    case "RUNNING":
      colorClass = "bg-blue-100 text-blue-800 border-blue-200"
      break
    case "FAILED_TEMPORARY":
    case "RETRY_PENDING":
      colorClass = "bg-yellow-100 text-yellow-800 border-yellow-200"
      break
    case "UNKNOWN":
    case "CANCELLED":
    default:
      colorClass = "bg-gray-100 text-gray-800 border-gray-200"
  }

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", colorClass, className)}>
      {status}
    </span>
  )
}
