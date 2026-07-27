'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';

export default function VendorMasterPage() {
  return (
    <PermissionGate permission="MANAGE_ORGANIZATION">
      <div className="space-y-6 p-8">
        <h1 className="text-3xl font-bold">Vendor Master Intelligence</h1>
        <p className="text-muted-foreground">Approve suggested Tally Ledgers or map to existing vendors based on GSTIN, PAN, and Similarity.</p>
        
        <div className="rounded-md border p-6 bg-card text-card-foreground">
          <h3 className="font-semibold text-lg mb-4">Pending Resolutions</h3>
          <ul className="space-y-4">
             <li className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">ABC Traders Private Limited</p>
                  <p className="text-sm text-muted-foreground">Similarity Match: 92% with "ABC Traders Pvt Ltd"</p>
                </div>
                <div className="space-x-2">
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Approve Mapping</button>
                  <button className="px-4 py-2 border rounded-md text-sm">Create New Ledger</button>
                </div>
             </li>
          </ul>
        </div>
      </div>
    </PermissionGate>
  );
}
