"use client";

import { useDecision } from "@/queries/useDecisions";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ConnectionError } from "@/components/ConnectionError";
import { ArrowLeft, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

function DecisionDetailContent() {
  const params = useParams();
  const id = params.id as string;
  const { data, isLoading, isError, refetch } = useDecision(id);

  if (isLoading) return <LoadingSkeleton count={3} />;
  if (isError || !data) return <ConnectionError onRetry={refetch} />;

  const decision = (data as any).data;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/decisions" className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Decision Explainer</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">{decision.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="p-6 border rounded-xl bg-card shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Outcome</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase font-semibold">Ledger Selected</label>
                <div className="text-xl font-medium mt-1">{decision.ledgerSelected || "None"}</div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase font-semibold">Reasoning</label>
                <div className="text-sm mt-1">{decision.reasoning}</div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase font-semibold">Confidence</label>
                <div className="text-lg font-medium mt-1 text-emerald-600 dark:text-emerald-400">
                  {decision.confidenceScore}%
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 border rounded-xl bg-card shadow-sm">
            <h3 className="font-semibold text-lg mb-4">Rules Applied</h3>
            <pre className="p-4 bg-muted text-xs rounded-md overflow-x-auto">
              {JSON.stringify(decision.rulesApplied, null, 2)}
            </pre>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 border rounded-xl bg-card shadow-sm h-full">
            <h3 className="font-semibold text-lg mb-4">Input Evidence</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase font-semibold">Raw Data Context</label>
                <pre className="p-4 bg-muted text-xs rounded-md overflow-x-auto mt-2 h-[300px] overflow-y-auto">
                  {JSON.stringify(decision.inputData, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DecisionDetailPage() {
  return (
    <ErrorBoundary>
      <DecisionDetailContent />
    </ErrorBoundary>
  );
}
