"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { PageContainer } from "@/components/ui/page"
import { ErrorState } from "@/components/ui/states"
import { LoadingSpinner } from "@/components/ui/loading"
import { RefreshButton } from "@/components/dashboard/refresh-button"

import { ERPStatusCard } from "@/components/erp/erp-status-card"
import { ERPQueueCard } from "@/components/erp/erp-queue-card"
import { ERPHistoryTable } from "@/components/erp/erp-history-table"

export default function ERPStatusPage() {
  const { data: statusData, isLoading: isStatusLoading, error: statusError, refetch: refetchStatus, isFetching: isStatusFetching } = useQuery({
    queryKey: ['erp-status'],
    queryFn: async () => {
      const { data } = await api.get('/erp/status')
      return data
    },
  })

  const { data: historyData, isLoading: isHistoryLoading, error: historyError, refetch: refetchHistory, isFetching: isHistoryFetching } = useQuery({
    queryKey: ['erp-history'],
    queryFn: async () => {
      const { data } = await api.get('/erp/history')
      return data || []
    },
  })

  const handleRefresh = () => {
    refetchStatus()
    refetchHistory()
  }

  const isLoading = isStatusLoading || isHistoryLoading
  const isFetching = isStatusFetching || isHistoryFetching
  const hasError = statusError || historyError

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">ERP Monitoring</h1>
          <p className="text-muted-foreground mt-1">Real-time status of ERP synchronization and queues</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <RefreshButton onRefresh={handleRefresh} isRefreshing={isFetching} />
        </div>
      </div>

      {hasError ? (
        <ErrorState 
          title="Failed to load ERP monitoring data" 
          message={((statusError || historyError) as any).message} 
          onRetry={handleRefresh} 
        />
      ) : isLoading ? (
        <div className="flex justify-center items-center h-64 border rounded-lg bg-card text-muted-foreground">
          <LoadingSpinner className="mr-3" /> Loading monitoring data...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ERPStatusCard statusData={statusData} />
            <ERPQueueCard statusData={statusData} />
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Recent Synchronization History</h3>
            <ERPHistoryTable historyList={historyData} />
          </div>
        </div>
      )}
    </PageContainer>
  )
}
