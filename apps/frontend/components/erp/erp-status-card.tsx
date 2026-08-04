import * as React from "react"
import { ERPStatusBadge } from "./erp-status-badge"

export function ERPStatusCard({ statusData }: { statusData: any }) {
  if (!statusData) return null

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="border rounded-lg bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">System Status</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex flex-col space-y-1">
          <span className="text-muted-foreground">Worker Status</span>
          <div><ERPStatusBadge status={statusData.workers} /></div>
        </div>
        <div className="flex flex-col space-y-1">
          <span className="text-muted-foreground">Average Sync Time</span>
          <span className="font-medium">{statusData.averageSyncTime} ms</span>
        </div>
        <div className="flex flex-col space-y-1">
          <span className="text-muted-foreground">Last Successful Sync</span>
          <span className="font-medium">{formatDate(statusData.lastSync)}</span>
        </div>
        <div className="flex flex-col space-y-1">
          <span className="text-muted-foreground">Last Failure</span>
          <span className="font-medium">{formatDate(statusData.lastFailure)}</span>
        </div>
      </div>
    </div>
  )
}
