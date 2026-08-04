import * as React from "react"
import { AuditEventRecord } from "@/types/audit"
import { AuditEventRow } from "./audit-event-row"
import { EmptyState } from "@/components/ui/states"

export function AuditEventTable({ events, onSelectEvent }: { events: AuditEventRecord[], onSelectEvent: (eventRecord: AuditEventRecord) => void }) {
  if (!events || events.length === 0) {
    return <EmptyState title="No Events Found" description="There are no audit events available in the system." />
  }

  return (
    <div className="rounded-md border overflow-x-auto bg-card shadow-sm">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b bg-muted/50">
          <tr className="border-b transition-colors hover:bg-muted/50">
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Timestamp</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Module</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Event</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Result</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">User</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Correlation ID</th>
            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Action</th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {events.map((eventRecord, idx) => (
            <AuditEventRow 
              key={`${eventRecord.correlationId}-${idx}`} 
              eventRecord={eventRecord} 
              onClick={() => onSelectEvent(eventRecord)} 
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
