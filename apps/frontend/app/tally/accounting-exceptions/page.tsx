'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';

export default function AccountingExceptionsPage() {
  return (
    <PermissionGate permission="MANAGE_ORGANIZATION">
      <div className="space-y-6 p-8">
        <h1 className="text-3xl font-bold">Accounting Exceptions</h1>
        <p className="text-muted-foreground">Review structural debits/credits mismatches and reconciliation discrepancies.</p>
        
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-4 text-left font-medium">Voucher ID</th>
                <th className="p-4 text-left font-medium">Type</th>
                <th className="p-4 text-left font-medium">Problem</th>
                <th className="p-4 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-4">INV-1023</td>
                <td className="p-4">MISMATCHED</td>
                <td className="p-4 text-orange-500">Debit/Credit structural mismatch against Tally</td>
                <td className="p-4 space-x-2">
                  <button className="text-primary hover:underline">Review</button>
                  <button className="text-destructive hover:underline">Force Sync</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </PermissionGate>
  );
}
