'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';

export default function SecurityAdminPage() {
  return (
    <PermissionGate permission="MANAGE_ORGANIZATION">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Security Center</h1>
        <p className="text-muted-foreground">Manage organization security policies, MFA settings, and API keys.</p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="font-semibold leading-none tracking-tight mb-2">API Keys</h3>
            <p className="text-sm text-muted-foreground">Generate and revoke API keys for external integrations.</p>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="font-semibold leading-none tracking-tight mb-2">Authentication</h3>
            <p className="text-sm text-muted-foreground">Configure MFA requirements and view login audit logs.</p>
          </div>
        </div>
      </div>
    </PermissionGate>
  );
}
