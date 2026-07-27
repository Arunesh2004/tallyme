'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';

export default function IntelligenceDashboardPage() {
  return (
    <PermissionGate permission="FINANCE_MANAGER">
      <div className="space-y-6 p-8">
        <h1 className="text-3xl font-bold">Intelligence & Accuracy Dashboard</h1>
        <p className="text-muted-foreground">Monitor AI extraction quality and human correction learning loops.</p>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="font-semibold mb-2">Overall Extraction Accuracy</h3>
            <p className="text-4xl font-bold text-green-600">96%</p>
            <p className="text-sm text-muted-foreground mt-2">Trailing 30 days</p>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="font-semibold mb-2">Vendor Matching Accuracy</h3>
            <p className="text-4xl font-bold text-green-600">94%</p>
            <p className="text-sm text-muted-foreground mt-2">Trailing 30 days</p>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="font-semibold mb-2">Invoice Number Accuracy</h3>
            <p className="text-4xl font-bold text-green-600">98%</p>
            <p className="text-sm text-muted-foreground mt-2">Trailing 30 days</p>
          </div>
        </div>

        <div className="mt-8 rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-4 text-left font-medium">Model Version</th>
                <th className="p-4 text-left font-medium">Field</th>
                <th className="p-4 text-left font-medium">Correction Pattern Frequency</th>
                <th className="p-4 text-left font-medium">Confidence Improvement</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-4">v2-production</td>
                <td className="p-4">vendorName</td>
                <td className="p-4">15</td>
                <td className="p-4 text-green-600">+1.5%</td>
              </tr>
              <tr className="border-b">
                <td className="p-4">v2-production</td>
                <td className="p-4">amount</td>
                <td className="p-4">3</td>
                <td className="p-4 text-green-600">+0.1%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </PermissionGate>
  );
}
