"use client";

import { useDashboard } from "@/queries/useDashboard";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ConnectionError } from "@/components/ConnectionError";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { Activity, CheckSquare, AlertCircle, ArrowRightLeft } from "lucide-react";

function DashboardContent() {
  const { data, isLoading, isError, refetch } = useDashboard();

  if (isLoading) {
    return <LoadingSkeleton count={3} />;
  }

  if (isError || !data) {
    return (
      <ConnectionError 
        onRetry={refetch} 
      />
    );
  }

  const { system, accounting, migration, approvals, aiMetrics, tallyMetrics } = (data as any).data || {};
  const chartData = (data as any).chartData || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Enterprise Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of accounting intelligence and Tally sync operations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* System Health */}
        <div className="p-6 border rounded-xl bg-card shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm text-muted-foreground">Tally Connection</h3>
            <Activity className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold">{system?.tallyStatus || "Connected"}</div>
          <p className="text-xs text-muted-foreground mt-1">Latency: {tallyMetrics?.latencyMs || 0}ms</p>
        </div>

        {/* AI Metrics */}
        <div className="p-6 border rounded-xl bg-card shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm text-muted-foreground">AI Intelligence</h3>
            <CheckSquare className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold">{(aiMetrics?.averageConfidence * 100 || 0).toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground mt-1">Average Confidence</p>
        </div>

        {/* Manual Reviews */}
        <div className="p-6 border rounded-xl bg-card shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm text-muted-foreground">Pending Reviews</h3>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold">{aiMetrics?.manualReviewCount || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Requires human verification</p>
        </div>

        {/* Sync Status */}
        <div className="p-6 border rounded-xl bg-card shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm text-muted-foreground">Tally Operations</h3>
            <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{tallyMetrics?.successfulOperations || 0}</span>
            <span className="text-sm text-muted-foreground">successful</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-destructive">{tallyMetrics?.failedRequests || 0} failed</p>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="p-6 border rounded-xl bg-card shadow-sm">
          <h3 className="font-medium mb-6">Transactions Processed</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                />
                <Bar dataKey="processed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 border rounded-xl bg-card shadow-sm">
          <h3 className="font-medium mb-6">Extraction Confidence Distribution</h3>
          <div className="flex flex-col justify-center h-64 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>High (90-100%)</span>
                <span className="font-medium">85%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: "85%" }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Medium (75-89%)</span>
                <span className="font-medium">10%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: "10%" }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Low (&lt;75%)</span>
                <span className="font-medium">5%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-destructive h-2 rounded-full" style={{ width: "5%" }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
