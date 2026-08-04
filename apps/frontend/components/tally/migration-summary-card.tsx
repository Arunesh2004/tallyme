import * as React from "react"
import { MigrationStatusBadge } from "./migration-status-badge"
import { MigrationHistoryRecord } from "@/types/migration"

export function MigrationSummaryCard({ migrations }: { migrations: MigrationHistoryRecord[] }) {
  if (!migrations) return null

  const total = migrations.length
  const completed = migrations.filter(m => m.status === 'COMPLETED').length
  const failed = migrations.filter(m => m.status === 'FAILED').length
  const rollbackSupported = migrations.filter(m => m.rollbackSupported).length

  return (
    <div className="border rounded-lg bg-card p-6 shadow-sm mb-6">
      <h3 className="text-lg font-semibold mb-4">Migration Summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <div className="flex flex-col space-y-1 p-3 bg-muted/30 rounded-md">
          <span className="text-muted-foreground">Total Migrations</span>
          <span className="font-bold text-xl">{total}</span>
        </div>
        <div className="flex flex-col space-y-1 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
          <span className="text-muted-foreground">Completed</span>
          <span className="font-bold text-xl text-green-700 dark:text-green-400">{completed}</span>
        </div>
        <div className="flex flex-col space-y-1 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
          <span className="text-muted-foreground">Failed</span>
          <span className="font-bold text-xl text-red-700 dark:text-red-400">{failed}</span>
        </div>
        <div className="flex flex-col space-y-1 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <span className="text-muted-foreground">Rollback Supported</span>
          <span className="font-bold text-xl text-blue-700 dark:text-blue-400">{rollbackSupported}</span>
        </div>
      </div>
    </div>
  )
}
