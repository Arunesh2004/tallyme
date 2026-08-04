"use client"

import * as React from "react"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { PageContainer } from "@/components/ui/page"
import { ErrorState } from "@/components/ui/states"
import { LoadingSpinner } from "@/components/ui/loading"
import { RefreshButton } from "@/components/dashboard/refresh-button"

import { AuditEventRecord } from "@/types/audit"
import { AuditSummaryCard } from "@/components/audit/audit-summary-card"
import { AuditEventTable } from "@/components/audit/audit-event-table"
import { AuditDetailsPanel } from "@/components/audit/audit-details-panel"

export default function AuditEventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<AuditEventRecord | null>(null)

  const { data: events, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['audit-events'],
    queryFn: async () => {
      const { data } = await api.get('/audit/events', { params: { limit: 100 } })
      return data || []
    },
  })

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Audit Center</h1>
          <p className="text-muted-foreground mt-1">Unified view of all operational workflows and system events.</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <RefreshButton onRefresh={refetch} isRefreshing={isFetching} />
        </div>
      </div>

      {error ? (
        <ErrorState 
          title="Failed to load audit events" 
          message={error instanceof Error ? error.message : "An unknown error occurred"} 
          onRetry={refetch} 
        />
      ) : isLoading ? (
        <div className="flex justify-center items-center h-64 border rounded-lg bg-card text-muted-foreground">
          <LoadingSpinner className="mr-3" /> Loading audit timeline...
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
          <AuditSummaryCard events={events} />
          
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Event Timeline</h3>
            <AuditEventTable 
              events={events} 
              onSelectEvent={setSelectedEvent} 
            />
          </div>
        </div>
      )}

      {selectedEvent && (
        <AuditDetailsPanel 
          eventRecord={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
        />
      )}
    </PageContainer>
  )
}
