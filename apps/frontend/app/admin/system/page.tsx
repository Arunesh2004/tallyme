'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';

export default function SystemAdminPage() {
  return (
    <PermissionGate permission="MANAGE_ORGANIZATION">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">System Operations</h1>
        <p className="text-muted-foreground">Monitor enterprise reliability and background processes.</p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="font-semibold leading-none tracking-tight mb-2">Queue Health</h3>
            <p className="text-sm text-muted-foreground">Monitor BullMQ workers, failed jobs, and processing latencies.</p>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="font-semibold leading-none tracking-tight mb-2">Data Governance</h3>
            <p className="text-sm text-muted-foreground">Manage data retention policies and trigger enterprise data exports.</p>
          </div>
        </div>
      </div>
    </PermissionGate>
  );
}
