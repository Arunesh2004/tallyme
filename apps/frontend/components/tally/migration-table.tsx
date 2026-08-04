import * as React from "react"
import { MigrationRow } from "./migration-row"
import { EmptyState } from "@/components/ui/states"
import { MigrationHistoryRecord } from "@/types/migration"

export function MigrationTable({ migrations, onSelectMigration }: { migrations: MigrationHistoryRecord[], onSelectMigration: (migration: MigrationHistoryRecord) => void }) {
  if (!migrations || migrations.length === 0) {
    return <EmptyState title="No Migrations Found" description="There are no tally migration records available." />
  }

  return (
    <div className="rounded-md border overflow-x-auto bg-card shadow-sm">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b bg-muted/50">
          <tr className="border-b transition-colors hover:bg-muted/50">
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[100px]">ID</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Operation</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Object Type</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Object Name</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Timestamp</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-right">Properties</th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {migrations.map((migration) => (
            <MigrationRow key={migration.id} migration={migration} onClick={() => onSelectMigration(migration)} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
