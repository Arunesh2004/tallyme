"use client";

import { useDecisions } from "@/queries/useDecisions";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ConnectionError } from "@/components/ConnectionError";
import { EmptyState } from "@/components/EmptyState";
import { Search, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function DecisionsContent() {
  const { data, isLoading, isError, refetch } = useDecisions();

  if (isLoading) return <LoadingSkeleton count={4} />;
  if (isError || !data) return <ConnectionError onRetry={refetch} />;

  const decisions = (data as any).data || [];

  if (decisions.length === 0) {
    return (
      <EmptyState
        title="No decisions found"
        description="Accounting intelligence hasn't processed any decisions yet."
        icon={<Search className="h-12 w-12 text-muted-foreground" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Accounting Decisions Explorer</h1>
        <p className="text-muted-foreground mt-1">Audit and explain AI ledger mapping decisions.</p>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-3">Timestamp</th>
              <th className="px-6 py-3">Document ID</th>
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3">Confidence</th>
              <th className="px-6 py-3">Ledger Selected</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {decisions.map((dec: any) => (
              <tr key={dec.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                  {new Date(dec.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 font-mono text-muted-foreground">
                  {(dec.inputData as any)?.documentId?.substring(0,8) || dec.id.substring(0,8)}
                </td>
                <td className="px-6 py-4 font-medium">{dec.decisionCategory}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium",
                    dec.confidenceScore >= 90 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" :
                    dec.confidenceScore >= 75 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" :
                    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  )}>
                    {dec.confidenceScore}%
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-muted rounded-md font-medium text-xs">
                    {dec.ledgerSelected || "None"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link 
                    href={`/decisions/${dec.id}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium"
                  >
                    Explain <ChevronRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DecisionsPage() {
  return (
    <ErrorBoundary>
      <DecisionsContent />
    </ErrorBoundary>
  );
}
