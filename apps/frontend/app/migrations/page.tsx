"use client";

import { useMigrationsDashboard, useExecuteMigration, useRollbackMigration } from "@/queries/useMigrations";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ConnectionError } from "@/components/ConnectionError";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { EmptyState } from "@/components/EmptyState";
import { ArrowRightLeft, Play, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

function MigrationsContent() {
  const { data, isLoading, isError, refetch } = useMigrationsDashboard();
  const executeMutation = useExecuteMigration();
  const rollbackMutation = useRollbackMigration();

  if (isLoading) return <LoadingSkeleton count={4} />;
  if (isError || !data) return <ConnectionError onRetry={refetch} />;

  const plans = (data as any).data || [];

  if (plans.length === 0) {
    return (
      <EmptyState
        title="No Migrations"
        description="There are no migration plans currently generated."
        icon={<ArrowRightLeft className="h-12 w-12 text-muted-foreground" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Migrations Command Center</h1>
        <p className="text-muted-foreground mt-1">Execute approved structure changes into Tally Prime.</p>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-3">Migration Plan</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {plans.map((plan: any) => (
              <tr key={plan.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 font-mono text-muted-foreground">
                  {plan.id.substring(0,8)}
                </td>
                <td className="px-6 py-4 font-medium">{plan.type}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium",
                    plan.status === "APPROVED" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" :
                    plan.status === "EXECUTED" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                    plan.status === "FAILED" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                    plan.status === "ROLLED_BACK" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {plan.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <PermissionGate role="ACCOUNTING_ADMIN">
                    <div className="flex items-center justify-end gap-2">
                      {plan.status === "APPROVED" && (
                        <button 
                          onClick={() => executeMutation.mutate(plan.id)}
                          disabled={executeMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Execute
                        </button>
                      )}
                      {(plan.status === "EXECUTED" || plan.status === "FAILED") && (
                        <button 
                          onClick={() => rollbackMutation.mutate(plan.id)}
                          disabled={rollbackMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-md text-xs font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                          Rollback
                        </button>
                      )}
                    </div>
                  </PermissionGate>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MigrationsPage() {
  return (
    <ErrorBoundary>
      <MigrationsContent />
    </ErrorBoundary>
  );
}
