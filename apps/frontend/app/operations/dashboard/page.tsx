'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import Link from 'next/link';

export default function OperationsDashboardPage() {
  return (
    <PermissionGate permission="ACCOUNTING_REVIEWER">
      <div className="space-y-6 p-8">
        <h1 className="text-3xl font-bold">Accounting Operations</h1>
        <p className="text-muted-foreground">Main hub for Vendor processing, Exceptions, and Batch Approvals.</p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/operations/vendors" className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 hover:bg-muted transition-colors">
            <h3 className="font-semibold leading-none tracking-tight mb-2">Pending Reviews</h3>
            <p className="text-3xl font-bold">12</p>
            <p className="text-sm text-muted-foreground mt-2">Vendor extractions requiring attention</p>
          </Link>
          <Link href="/operations/exceptions" className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 hover:bg-muted transition-colors">
            <h3 className="font-semibold leading-none tracking-tight mb-2">High Risk Exceptions</h3>
            <p className="text-3xl font-bold text-red-600">3</p>
            <p className="text-sm text-muted-foreground mt-2">Unresolved accounting faults</p>
          </Link>
          <Link href="/operations/batches" className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 hover:bg-muted transition-colors">
            <h3 className="font-semibold leading-none tracking-tight mb-2">Approval Batches</h3>
            <p className="text-3xl font-bold text-blue-600">5</p>
            <p className="text-sm text-muted-foreground mt-2">Batches waiting for Finance Manager</p>
          </Link>
          <Link href="/intelligence/dashboard" className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 hover:bg-muted transition-colors">
            <h3 className="font-semibold leading-none tracking-tight mb-2">AI Extraction Accuracy</h3>
            <p className="text-3xl font-bold text-green-600">96.5%</p>
            <p className="text-sm text-muted-foreground mt-2">Overall confidence</p>
          </Link>
        </div>
      </div>
    </PermissionGate>
  );
}
