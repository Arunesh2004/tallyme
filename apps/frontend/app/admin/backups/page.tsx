'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';

export default function BackupsAdminPage() {
  return (
    <PermissionGate permission="MANAGE_ORGANIZATION">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Disaster Recovery</h1>
        <p className="text-muted-foreground">Manage database backups, verify integrity, and simulate restores.</p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="font-semibold leading-none tracking-tight mb-2">Recovery Test Logs</h3>
            <p className="text-sm text-muted-foreground">View historical DR simulation results and verified tables.</p>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="font-semibold leading-none tracking-tight mb-2">Backup Management</h3>
            <p className="text-sm text-muted-foreground">Trigger manual backups and configure automated schedules.</p>
          </div>
        </div>
      </div>
    </PermissionGate>
  );
}
