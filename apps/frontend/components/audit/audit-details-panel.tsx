import * as React from "react"
import { AuditEventRecord } from "@/types/audit"
import { AuditEventBadge } from "./audit-event-badge"

export function AuditDetailsPanel({ eventRecord, onClose }: { eventRecord: AuditEventRecord, onClose: () => void }) {
  if (!eventRecord) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md h-full bg-card border-l shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-bold">Event Details</h2>
            <p className="text-sm text-muted-foreground">{eventRecord.module}</p>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 hover:bg-muted text-muted-foreground transition-colors"
            aria-label="Close details panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Timestamp</span>
            <p className="font-medium">{new Date(eventRecord.timestamp).toLocaleString()}</p>
          </div>

          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Module</span>
            <p className="font-medium">{eventRecord.module}</p>
          </div>

          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Event</span>
            <p className="font-medium">{eventRecord.event}</p>
          </div>

          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Result</span>
            <div><AuditEventBadge result={eventRecord.result} /></div>
          </div>

          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">User</span>
            <p className="font-medium">{eventRecord.user}</p>
          </div>

          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Correlation ID</span>
            <p className="font-mono text-sm break-all bg-muted p-2 rounded-md">{eventRecord.correlationId}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
