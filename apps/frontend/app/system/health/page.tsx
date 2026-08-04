"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { PageContainer } from "@/components/ui/page"
import { SectionHeader } from "@/components/dashboard/section-header"
import { RefreshButton } from "@/components/dashboard/refresh-button"
import { StatusCard } from "@/components/dashboard/status-card"
import { ErrorState } from "@/components/ui/states"
import { LoadingSpinner } from "@/components/ui/loading"

interface SystemHealth {
  status: string
  version: string
  uptime: number
  services: {
    database: string
    tallyAgent: string
    queue: string
  }
}

const fetchSystemHealth = async (): Promise<SystemHealth> => {
  const { data } = await api.get('/system/health')
  return data
}

export default function SystemHealthPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['system-health'],
    queryFn: fetchSystemHealth,
    refetchInterval: 15000, // auto-refresh every 15s
  })

  if (error) {
    return (
      <PageContainer>
        <SectionHeader title="System Health" />
        <ErrorState 
          title="Failed to load system health" 
          message={error.message || "An error occurred while fetching system health status."}
          onRetry={refetch}
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <SectionHeader title="System Health" description="Real-time status of all underlying services">
        <RefreshButton onRefresh={refetch} isRefreshing={isFetching} />
      </SectionHeader>

      {isLoading ? (
        <div className="flex justify-center items-center h-64 border rounded-lg bg-card text-muted-foreground">
          <LoadingSpinner className="mr-3" /> Checking services...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 border rounded-lg bg-card flex justify-between items-center">
            <div>
              <div className="font-semibold text-lg">Overall Platform Status</div>
              <div className="text-sm text-muted-foreground">Version: {data?.version || 'Unknown'} | Uptime: {data?.uptime ? Math.floor(data.uptime / 60) + ' mins' : '0 mins'}</div>
            </div>
            <div className="px-4 py-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full font-bold uppercase text-sm tracking-widest">
              {data?.status || 'Unknown'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatusCard 
              name="Primary Database (PostgreSQL)" 
              status={data?.services?.database || "unknown"} 
            />
            <StatusCard 
              name="Tally Agent Connector" 
              status={data?.services?.tallyAgent || "unknown"} 
            />
            <StatusCard 
              name="Background Queue (BullMQ)" 
              status={data?.services?.queue || "unknown"} 
            />
          </div>
        </div>
      )}
    </PageContainer>
  )
}
