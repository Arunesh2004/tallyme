import * as React from "react"
import { ERPStatusBadge } from "./erp-status-badge"

export function ERPHistoryRow({ historyEntry }: { historyEntry: any }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <tr className="border-b transition-colors hover:bg-muted/50">
      <td className="p-4 align-middle text-xs font-mono text-muted-foreground" title={historyEntry.id}>{historyEntry.id.substring(0, 8)}...</td>
      <td className="p-4 align-middle text-xs font-mono text-muted-foreground" title={historyEntry.jobId}>{historyEntry.jobId.substring(0, 8)}...</td>
      <td className="p-4 align-middle">
        {historyEntry.statusFrom ? <ERPStatusBadge status={historyEntry.statusFrom} /> : <span className="text-muted-foreground text-xs italic">N/A</span>}
      </td>
      <td className="p-4 align-middle">
        <span className="mx-2 text-muted-foreground">→</span>
        <ERPStatusBadge status={historyEntry.statusTo} />
      </td>
      <td className="p-4 align-middle text-sm text-muted-foreground max-w-[200px] truncate" title={historyEntry.reason || ""}>
        {historyEntry.reason || "-"}
      </td>
      <td className="p-4 align-middle text-sm text-muted-foreground whitespace-nowrap">
        {formatDate(historyEntry.createdAt)}
      </td>
    </tr>
  )
}
