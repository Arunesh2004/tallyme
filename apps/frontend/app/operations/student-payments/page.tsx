'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';

export default function StudentPaymentsPage() {
  return (
    <PermissionGate permission="ACCOUNTING_REVIEWER">
      <div className="space-y-6 p-8">
        <h1 className="text-3xl font-bold">Student Finance Operations</h1>
        <p className="text-muted-foreground">Validate and manage student fee payment vouchers before Tally synchronization.</p>
        
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-4 text-left font-medium">Date</th>
                <th className="p-4 text-left font-medium">Student</th>
                <th className="p-4 text-left font-medium">Amount</th>
                <th className="p-4 text-left font-medium">Validation Status</th>
                <th className="p-4 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-4">23 July</td>
                <td className="p-4">Arun Sharma</td>
                <td className="p-4">₹5000</td>
                <td className="p-4 text-green-600">VALID</td>
                <td className="p-4 space-x-2">
                  <button className="text-primary hover:underline">Sync</button>
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-4">24 July</td>
                <td className="p-4">John Doe</td>
                <td className="p-4">₹4500</td>
                <td className="p-4 text-red-500">MISSING_CLASS</td>
                <td className="p-4 space-x-2">
                  <button className="text-destructive hover:underline">Resolve</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </PermissionGate>
  );
}
