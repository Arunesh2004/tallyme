'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';

export default function MasterHealthPage() {
  return (
    <PermissionGate permission="MANAGE_ORGANIZATION">
      <div className="space-y-6 p-8">
        <h1 className="text-3xl font-bold">Master Health</h1>
        <p className="text-muted-foreground">Overview of Tally Master Data Synchronization.</p>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-2">Mapped Ledgers</h3>
            <p className="text-3xl font-bold">1200 / 1205</p>
            <p className="text-sm text-red-500 mt-2">5 Missing Mappings</p>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-2">Groups & Cost Centres</h3>
            <p className="text-3xl font-bold">85 Groups</p>
            <p className="text-sm text-green-500 mt-2">All synchronized</p>
          </div>
        </div>
      </div>
    </PermissionGate>
  );
}
