"use client";

import { useReviewQueue } from "@/queries/useReviewQueue";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ConnectionError } from "@/components/ConnectionError";
import { EmptyState } from "@/components/EmptyState";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

function ReviewQueueContent() {
  const { data, isLoading, isError, refetch } = useReviewQueue();

  if (isLoading) return <LoadingSkeleton count={4} />;
  if (isError || !data) return <ConnectionError onRetry={refetch} />;

  const queue = (data as any).data || [];

  if (queue.length === 0) {
    return (
      <EmptyState
        title="Queue is empty"
        description="There are no items currently requiring manual review."
        icon={<CheckCircle2 className="h-12 w-12 text-emerald-500" />}
      />
    );
  }

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "CRITICAL": return "text-destructive bg-destructive/10 border-destructive/20";
      case "HIGH": return "text-orange-600 bg-orange-100 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400";
      default: return "text-blue-600 bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch(priority) {
      case "CRITICAL": return <AlertTriangle className="h-4 w-4" />;
      case "HIGH": return <AlertTriangle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
        <p className="text-muted-foreground mt-1">Resolve flagged items and accounting blockages.</p>
      </div>

      <div className="flex flex-col gap-4">
        {queue.map((item: any) => (
          <div key={`${item.entityId}-${item.entityType}`} className="flex flex-col md:flex-row gap-4 p-5 border rounded-xl bg-card shadow-sm hover:border-primary/30 transition-colors">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", getPriorityColor(item.priority))}>
                  {getPriorityIcon(item.priority)}
                  {item.priority}
                </span>
                <span className="text-sm font-medium text-muted-foreground px-2 py-0.5 bg-muted rounded-md">{item.entityType}</span>
                <span className="text-sm font-mono text-muted-foreground">{item.entityId.substring(0, 8)}</span>
              </div>
              <h3 className="text-base font-semibold">{item.reason}</h3>
              <p className="text-sm text-muted-foreground">Logged at: {new Date(item.createdAt).toLocaleString()}</p>
            </div>
            
            <div className="flex items-center justify-end md:border-l md:pl-6 shrink-0">
              <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors">
                Resolve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReviewQueuePage() {
  return (
    <ErrorBoundary>
      <ReviewQueueContent />
    </ErrorBoundary>
  );
}
