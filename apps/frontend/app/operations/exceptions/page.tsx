'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';

export default function ExceptionsPage() {
  return (
    <PermissionGate permission="ACCOUNTING_REVIEWER">
      <div className="space-y-6 p-8">
        <h1 className="text-3xl font-bold">Accounting Exception Center</h1>
        <p className="text-muted-foreground">Unified queue for all Tally validation, extraction, and missing ledger errors.</p>
        
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-4 text-left font-medium">Exception ID</th>
                <th className="p-4 text-left font-medium">Type</th>
                <th className="p-4 text-left font-medium">Severity</th>
                <th className="p-4 text-left font-medium">Description</th>
                <th className="p-4 text-left font-medium">Status</th>
                <th className="p-4 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-4">EXC-991</td>
                <td className="p-4">MISSING_LEDGER</td>
                <td className="p-4 text-red-500 font-bold">HIGH</td>
                <td className="p-4">Vendor ledger missing in Tally</td>
                <td className="p-4">OPEN</td>
                <td className="p-4 space-x-2">
                  <button className="text-primary hover:underline">Resolve</button>
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-4">EXC-992</td>
                <td className="p-4">LOW_EXTRACTION_CONFIDENCE</td>
                <td className="p-4 text-orange-500 font-bold">MEDIUM</td>
                <td className="p-4">Amount field confidence (89%) below threshold</td>
                <td className="p-4">OPEN</td>
                <td className="p-4 space-x-2">
                  <button className="text-primary hover:underline">Resolve</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </PermissionGate>
  );
}
