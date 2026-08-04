import * as React from "react"
import { MigrationHistoryRecord } from "@/types/migration"

export function MigrationDetailsPanel({ migration, onClose }: { migration: MigrationHistoryRecord, onClose: () => void }) {
  if (!migration) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-full bg-card border-l shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-bold">{migration.operation} - {migration.objectType}</h2>
            <p className="text-sm text-muted-foreground">ID: {migration.id}</p>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 hover:bg-muted text-muted-foreground transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 p-4 rounded-md">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Object Name</span>
              <p className="mt-1 font-medium">{migration.objectName}</p>
            </div>
            <div className="bg-muted/30 p-4 rounded-md">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
              <p className="mt-1 font-medium">{migration.status}</p>
            </div>
            <div className="bg-muted/30 p-4 rounded-md">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timestamp</span>
              <p className="mt-1 font-medium">{new Date(migration.createdAt).toLocaleString()}</p>
            </div>
            <div className="bg-muted/30 p-4 rounded-md">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rollback Supported</span>
              <p className="mt-1 font-medium">{migration.rollbackSupported ? "Yes" : "No"}</p>
            </div>
          </div>

          {migration.xmlRequest && (
            <div>
              <h3 className="font-semibold mb-2">XML Request (Read-Only)</h3>
              <pre className="bg-muted text-xs p-4 rounded-md overflow-x-auto text-foreground whitespace-pre-wrap max-h-64 overflow-y-auto">
                {migration.xmlRequest}
              </pre>
            </div>
          )}

          {migration.xmlResponse && (
            <div>
              <h3 className="font-semibold mb-2">XML Response (Read-Only)</h3>
              <pre className="bg-muted text-xs p-4 rounded-md overflow-x-auto text-foreground whitespace-pre-wrap max-h-64 overflow-y-auto">
                {migration.xmlResponse}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
