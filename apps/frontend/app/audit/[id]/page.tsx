"use client";

import { useAuditTimeline } from "@/queries/useAudit";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ConnectionError } from "@/components/ConnectionError";
import { Clock, CheckCircle2, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";

function AuditDetailContent() {
  const params = useParams();
  const id = params.id as string;
  const { data, isLoading, isError, refetch } = useAuditTimeline(id);

  if (isLoading) return <LoadingSkeleton count={3} />;
  if (isError || !data) return <ConnectionError onRetry={refetch} />;

  const events = (data as any).data || [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Timeline</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">{id}</p>
      </div>

      <div className="relative border-l-2 border-muted ml-6 pl-6 py-4 space-y-8">
        {events.map((event: any, index: number) => {
          let Icon = Clock;
          let iconColor = "text-muted-foreground";
          let bgColor = "bg-muted";

          if (event.action.includes("APPROVED") || event.action.includes("COMPLETED")) {
            Icon = CheckCircle2;
            iconColor = "text-emerald-500";
            bgColor = "bg-emerald-100 dark:bg-emerald-900/30";
          } else if (event.action.includes("FAILED") || event.action.includes("REJECTED")) {
            Icon = AlertTriangle;
            iconColor = "text-destructive";
            bgColor = "bg-destructive/10";
          } else if (event.action.includes("SYNC") || event.action.includes("MIGRATION")) {
            Icon = ArrowRightLeft;
            iconColor = "text-blue-500";
            bgColor = "bg-blue-100 dark:bg-blue-900/30";
          }

          return (
            <div key={index} className="relative">
              <div className={cn("absolute -left-[37px] rounded-full p-1.5 border-2 border-background", bgColor)}>
                <Icon className={cn("h-4 w-4", iconColor)} />
              </div>
              
              <div className="bg-card border rounded-lg p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{event.action}</h3>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground uppercase">
                    {event.source}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary uppercase">
                    {event.actor}
                  </span>
                </div>
                
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <pre className="p-3 bg-muted text-xs rounded-md overflow-x-auto text-muted-foreground">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AuditDetailPage() {
  return (
    <ErrorBoundary>
      <AuditDetailContent />
    </ErrorBoundary>
  );
}
