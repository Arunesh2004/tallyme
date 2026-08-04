"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { PageContainer } from "@/components/ui/page"
import { SectionHeader } from "@/components/dashboard/section-header"
import { RefreshButton } from "@/components/dashboard/refresh-button"
import { MetricTile } from "@/components/dashboard/metric-tile"
import { ErrorState } from "@/components/ui/states"
import { LoadingSpinner } from "@/components/ui/loading"
import { Receipt, GraduationCap, CheckCircle2, AlertTriangle } from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"

interface DashboardOverview {
  pendingVendorSlips: number
  pendingStudentSlips: number
  unprocessedTallyVouchers: number
  recentFailures: number
}

const fetchDashboard = async (): Promise<DashboardOverview> => {
  const { data } = await api.get('/dashboard/overview')
  return data
}

export default function DashboardPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: fetchDashboard,
    refetchInterval: 30000, // auto-refresh every 30s
  })

  if (error) {
    return (
      <PageContainer>
        <SectionHeader title="Dashboard Overview" />
        <ErrorState 
          title="Failed to load dashboard" 
          message={error.message || "An error occurred while fetching the dashboard data."}
          onRetry={refetch}
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <SectionHeader title="Dashboard Overview" description="High-level metrics across the accounting platform">
        <RefreshButton onRefresh={refetch} isRefreshing={isFetching} />
      </SectionHeader>

      {isLoading ? (
        <div className="flex justify-center items-center h-64 border rounded-lg bg-card text-muted-foreground">
          <LoadingSpinner className="mr-3" /> Loading metrics...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard 
            title="Pending Vendor Slips" 
            value={data?.pendingVendorSlips ?? 0}
            description="Awaiting manual triage"
            icon={<Receipt className="h-5 w-5" />}
          />
          <KpiCard 
            title="Pending Student Slips" 
            value={data?.pendingStudentSlips ?? 0}
            description="Awaiting manual triage"
            icon={<GraduationCap className="h-5 w-5" />}
          />
          <KpiCard 
            title="Unprocessed Tally Vouchers" 
            value={data?.unprocessedTallyVouchers ?? 0}
            description="Pending ERP synchronization"
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <KpiCard 
            title="Recent Sync Failures" 
            value={data?.recentFailures ?? 0}
            description="Errors requiring attention"
            icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
            className={data?.recentFailures && data.recentFailures > 0 ? "border-destructive/50 bg-destructive/5" : ""}
          />
        </div>
      )}
    </PageContainer>
  )
}
