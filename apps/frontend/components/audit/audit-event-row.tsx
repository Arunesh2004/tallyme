import * as React from "react"
import { AuditEventRecord } from "@/types/audit"
import { AuditEventBadge } from "./audit-event-badge"

export function AuditEventRow({ eventRecord, onClick }: { eventRecord: AuditEventRecord, onClick: () => void }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <tr className="border-b transition-colors hover:bg-muted/50">
      <td className="p-4 align-middle text-sm text-muted-foreground whitespace-nowrap">
        {formatDate(eventRecord.timestamp)}
      </td>
      <td className="p-4 align-middle text-sm text-muted-foreground">{eventRecord.module}</td>
      <td className="p-4 align-middle font-medium max-w-[250px] truncate" title={eventRecord.event}>{eventRecord.event}</td>
      <td className="p-4 align-middle">
        <AuditEventBadge result={eventRecord.result} />
      </td>
      <td className="p-4 align-middle text-sm text-muted-foreground">{eventRecord.user}</td>
      <td className="p-4 align-middle text-xs font-mono text-muted-foreground" title={eventRecord.correlationId}>
        {eventRecord.correlationId.substring(0, 8)}...
      </td>
      <td className="p-4 align-middle text-right">
        <button 
          onClick={onClick}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          View
        </button>
      </td>
    </tr>
  )
}
