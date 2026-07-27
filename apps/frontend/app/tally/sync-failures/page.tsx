'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';

export default function SyncFailuresPage() {
  return (
    <PermissionGate permission="MANAGE_ORGANIZATION">
      <div className="space-y-6 p-8">
        <h1 className="text-3xl font-bold">Sync Failures</h1>
        <p className="text-muted-foreground">Monitor and manage Tally synchronization errors.</p>
        
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-4 text-left font-medium">Job ID</th>
                <th className="p-4 text-left font-medium">Voucher Number</th>
                <th className="p-4 text-left font-medium">Error Reason</th>
                <th className="p-4 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-4">SYNC-992</td>
                <td className="p-4">RCT-1044</td>
                <td className="p-4 text-red-500">Tally XML Auth Error</td>
                <td className="p-4 space-x-2">
                  <button className="text-primary hover:underline">Retry</button>
                  <button className="text-destructive hover:underline">Rollback</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </PermissionGate>
  );
}
