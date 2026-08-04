import * as React from "react"
import { AuditEventRecord } from "@/types/audit"

export function AuditSummaryCard({ events }: { events: AuditEventRecord[] }) {
  if (!events) return null

  const total = events.length
  const successful = events.filter(e => e.result?.toUpperCase() === 'SUCCESS').length
  const failed = events.filter(e => e.result?.toUpperCase() === 'FAILED').length
  const modules = Array.from(new Set(events.map(e => e.module)))

  return (
    <div className="border rounded-lg bg-card p-6 shadow-sm mb-6">
      <h3 className="text-lg font-semibold mb-4">Audit Summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <div className="flex flex-col space-y-1 p-3 bg-muted/30 rounded-md">
          <span className="text-muted-foreground">Total Events</span>
          <span className="font-bold text-xl">{total}</span>
        </div>
        <div className="flex flex-col space-y-1 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
          <span className="text-muted-foreground">Successful</span>
          <span className="font-bold text-xl text-green-700 dark:text-green-400">{successful}</span>
        </div>
        <div className="flex flex-col space-y-1 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
          <span className="text-muted-foreground">Failed</span>
          <span className="font-bold text-xl text-red-700 dark:text-red-400">{failed}</span>
        </div>
        <div className="flex flex-col space-y-1 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <span className="text-muted-foreground">Modules Represented</span>
          <span className="font-bold text-xl text-blue-700 dark:text-blue-400">{modules.length}</span>
        </div>
      </div>
    </div>
  )
}
