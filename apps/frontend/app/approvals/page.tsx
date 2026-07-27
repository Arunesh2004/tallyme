"use client";

import { useState } from "react";
import { useApprovalsDashboard, useApproveAction, useRejectAction } from "@/queries/useApprovals";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ConnectionError } from "@/components/ConnectionError";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { EmptyState } from "@/components/EmptyState";
import { Check, X, ShieldAlert } from "lucide-react";

function ApprovalsContent() {
  const { data, isLoading, isError, refetch } = useApprovalsDashboard();
  const approveMutation = useApproveAction();
  const rejectMutation = useRejectAction();
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  if (isLoading) return <LoadingSkeleton count={3} />;
  if (isError || !data) return <ConnectionError onRetry={refetch} />;

  const highRisk = (data as any).data?.highRisk || [];

  if (highRisk.length === 0) {
    return (
      <EmptyState
        title="All caught up!"
        description="There are no pending approvals requiring your attention."
        icon={<Check className="h-12 w-12 text-emerald-500" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Governance Approvals</h1>
        <p className="text-muted-foreground mt-1">Review and approve high risk accounting decisions.</p>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Entity</th>
              <th className="px-6 py-3">Risk Level</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {highRisk.map((req: any) => (
              <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 font-medium">{req.type}</td>
                <td className="px-6 py-4">{req.entityType} ({req.entityId.substring(0,8)})</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    <ShieldAlert className="h-3 w-3" />
                    High Risk
                  </span>
                </td>
                <td className="px-6 py-4">{req.status}</td>
                <td className="px-6 py-4 text-right">
                  <PermissionGate role="APPROVER">
                    {rejectingId === req.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <input 
                          type="text" 
                          placeholder="Reason..." 
                          className="px-2 py-1 border rounded text-xs bg-background w-32"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <button 
                          onClick={() => {
                            rejectMutation.mutate({ id: req.id, reason: rejectReason || "Rejected by user" });
                            setRejectingId(null);
                          }}
                          className="px-2 py-1 bg-destructive text-white rounded text-xs hover:bg-destructive/90 disabled:opacity-50"
                          disabled={rejectMutation.isPending}
                        >
                          Confirm
                        </button>
                        <button 
                          onClick={() => setRejectingId(null)}
                          className="px-2 py-1 bg-muted rounded text-xs hover:bg-muted/80"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setRejectingId(req.id)}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          title="Reject"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => approveMutation.mutate(req.id)}
                          disabled={approveMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </button>
                      </div>
                    )}
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

export default function ApprovalsPage() {
  return (
    <ErrorBoundary>
      <ApprovalsContent />
    </ErrorBoundary>
  );
}
