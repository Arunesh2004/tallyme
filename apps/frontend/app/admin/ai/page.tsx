'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';

export default function AIAdminPage() {
  return (
    <PermissionGate permission="MANAGE_ORGANIZATION">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">AI Governance</h1>
        <p className="text-muted-foreground">Manage and monitor AI model versions, execution logs, and accuracy metrics.</p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="font-semibold leading-none tracking-tight mb-2">Model Performance</h3>
            <p className="text-sm text-muted-foreground">AI model accuracy and daily evaluation metrics will be displayed here.</p>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="font-semibold leading-none tracking-tight mb-2">Execution Logs</h3>
            <p className="text-sm text-muted-foreground">Real-time stream of AI decisions, inputs, and outputs.</p>
          </div>
        </div>
      </div>
    </PermissionGate>
  );
}
