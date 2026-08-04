"use client"

import * as React from "react"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { PageContainer } from "@/components/ui/page"
import { ErrorState } from "@/components/ui/states"
import { LoadingSpinner } from "@/components/ui/loading"
import { RefreshButton } from "@/components/dashboard/refresh-button"

import { MigrationTable } from "@/components/tally/migration-table"
import { MigrationSummaryCard } from "@/components/tally/migration-summary-card"
import { MigrationDetailsPanel } from "@/components/tally/migration-details-panel"
import { MigrationHistoryRecord } from "@/types/migration"

export default function TallyMigrationsPage() {
  const [selectedMigration, setSelectedMigration] = useState<MigrationHistoryRecord | null>(null)

  const { data: migrations, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['tally-migrations'],
    queryFn: async () => {
      const { data } = await api.get('/tally/migrations')
      return data || []
    },
  })

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tally Migration Center</h1>
          <p className="text-muted-foreground mt-1">Read-only audit of synchronization data maps and ERP execution diffs.</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <RefreshButton onRefresh={refetch} isRefreshing={isFetching} />
        </div>
      </div>

      {error ? (
        <ErrorState 
          title="Failed to load migrations" 
          message={error instanceof Error ? error.message : "An unknown error occurred"} 
          onRetry={refetch} 
        />
      ) : isLoading ? (
        <div className="flex justify-center items-center h-64 border rounded-lg bg-card text-muted-foreground">
          <LoadingSpinner className="mr-3" /> Loading migration history...
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
          <MigrationSummaryCard migrations={migrations} />
          
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Migration Execution History</h3>
            <MigrationTable 
              migrations={migrations} 
              onSelectMigration={setSelectedMigration} 
            />
          </div>
        </div>
      )}

      {selectedMigration && (
        <MigrationDetailsPanel 
          migration={selectedMigration} 
          onClose={() => setSelectedMigration(null)} 
        />
      )}
    </PageContainer>
  )
}
