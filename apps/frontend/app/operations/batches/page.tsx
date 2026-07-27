'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';

export default function BatchesPage() {
  return (
    <PermissionGate permission="FINANCE_MANAGER">
      <div className="space-y-6 p-8">
        <h1 className="text-3xl font-bold">Batch Approvals</h1>
        <p className="text-muted-foreground">Review and approve clustered transactions before initiating Tally synchronization.</p>
        
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-4 text-left font-medium">Batch ID</th>
                <th className="p-4 text-left font-medium">Created By</th>
                <th className="p-4 text-left font-medium">Items</th>
                <th className="p-4 text-left font-medium">Status</th>
                <th className="p-4 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-4">BAT-2026-001</td>
                <td className="p-4">Arun Sharma</td>
                <td className="p-4">100</td>
                <td className="p-4">PENDING</td>
                <td className="p-4 space-x-2">
                  <button className="text-primary hover:underline">Review Batch</button>
                  <button className="text-primary hover:underline">Approve All</button>
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-4">BAT-2026-002</td>
                <td className="p-4">Jane Doe</td>
                <td className="p-4">50</td>
                <td className="p-4">PARTIALLY_APPROVED</td>
                <td className="p-4 space-x-2">
                  <button className="text-primary hover:underline">Sync Approved</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </PermissionGate>
  );
}
