"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EmptyState } from "@/components/EmptyState";
import { Search } from "lucide-react";

function AuditContent() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Timeline</h1>
        <p className="text-muted-foreground mt-1">Select a document or transaction ID to view its complete timeline.</p>
      </div>
      
      <EmptyState
        title="Search Audit Logs"
        description="Enter a document or entity ID in the search bar above to trace its lifecycle."
        icon={<Search className="h-12 w-12 text-muted-foreground" />}
      />
    </div>
  );
}

export default function AuditPage() {
  return (
    <ErrorBoundary>
      <AuditContent />
    </ErrorBoundary>
  );
}
