"use client";

import { useTallyHealth } from "@/queries/useTallyHealth";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ConnectionError } from "@/components/ConnectionError";
import { Activity, Database, Clock, Server } from "lucide-react";
import { cn } from "@/lib/utils";

function TallyHealthContent() {
  const { data, isLoading, isError, refetch } = useTallyHealth();

  if (isLoading) return <LoadingSkeleton count={3} />;
  if (isError || !data) return <ConnectionError onRetry={refetch} />;

  const { isConnected, tallyStatus, lastSyncTime, discoveryMetrics, queueDepth } = data as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tally Health</h1>
          <p className="text-muted-foreground mt-1">Live metrics from the ERP Connector.</p>
        </div>
        <button 
          onClick={() => refetch()}
          className="px-4 py-2 bg-muted text-sm font-medium rounded-md hover:bg-muted/80"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connection Status */}
        <div className="p-6 border rounded-xl bg-card shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm text-muted-foreground">Status</h3>
            <Server className={cn("h-4 w-4", isConnected ? "text-emerald-500" : "text-destructive")} />
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={cn("relative inline-flex rounded-full h-3 w-3", isConnected ? "bg-emerald-500" : "bg-destructive")}></span>
            </span>
            <span className="text-2xl font-bold">{tallyStatus}</span>
          </div>
        </div>

        {/* Discovery Metrics - Masters */}
        <div className="p-6 border rounded-xl bg-card shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm text-muted-foreground">Masters Tracked</h3>
            <Database className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold">{discoveryMetrics?.totalMasters || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Ledgers, Groups, Cost Centres</p>
        </div>

        {/* Queue Depth */}
        <div className="p-6 border rounded-xl bg-card shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm text-muted-foreground">Queue Depth</h3>
            <Activity className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold">{queueDepth || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Pending sync operations</p>
        </div>

        {/* Last Sync */}
        <div className="p-6 border rounded-xl bg-card shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm text-muted-foreground">Last Discovery Sync</h3>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-lg font-bold">
            {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : "Never"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {lastSyncTime ? new Date(lastSyncTime).toLocaleDateString() : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TallyHealthPage() {
  return (
    <ErrorBoundary>
      <TallyHealthContent />
    </ErrorBoundary>
  );
}
