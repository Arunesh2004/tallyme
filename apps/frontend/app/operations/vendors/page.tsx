'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';

export default function VendorsQueuePage() {
  return (
    <PermissionGate permission="ACCOUNTING_REVIEWER">
      <div className="space-y-6 p-8">
        <h1 className="text-3xl font-bold">Vendor Transaction Queue</h1>
        <p className="text-muted-foreground">Review, Edit, and Approve extracted vendor transactions before batching.</p>
        
        <div className="flex justify-end mb-4">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm mr-2">Approve Selected</button>
          <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm border">Send Selected To Tally</button>
        </div>

        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-4 text-left font-medium"><input type="checkbox" /></th>
                <th className="p-4 text-left font-medium">Invoice</th>
                <th className="p-4 text-left font-medium">Vendor</th>
                <th className="p-4 text-left font-medium">Amount</th>
                <th className="p-4 text-left font-medium">Confidence</th>
                <th className="p-4 text-left font-medium">Status</th>
                <th className="p-4 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-4"><input type="checkbox" /></td>
                <td className="p-4">INV001</td>
                <td className="p-4">ABC Traders</td>
                <td className="p-4">₹15000</td>
                <td className="p-4 text-green-600">98%</td>
                <td className="p-4">READY_FOR_APPROVAL</td>
                <td className="p-4 space-x-2">
                  <button className="text-primary hover:underline">Edit</button>
                  <button className="text-primary hover:underline">Approve</button>
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-4"><input type="checkbox" /></td>
                <td className="p-4">INV002</td>
                <td className="p-4">XYZ Pvt Ltd</td>
                <td className="p-4">₹9000</td>
                <td className="p-4 text-red-500">62%</td>
                <td className="p-4">REVIEW_REQUIRED</td>
                <td className="p-4 space-x-2">
                  <button className="text-primary hover:underline">Edit</button>
                  <button className="text-destructive hover:underline">Reject</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </PermissionGate>
  );
}
