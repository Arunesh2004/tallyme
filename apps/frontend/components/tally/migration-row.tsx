import * as React from "react"
import { MigrationStatusBadge } from "./migration-status-badge"
import { MigrationHistoryRecord } from "@/types/migration"

export function MigrationRow({ migration, onClick }: { migration: MigrationHistoryRecord, onClick: () => void }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <tr className="border-b transition-colors hover:bg-muted/50 cursor-pointer" onClick={onClick}>
      <td className="p-4 align-middle text-xs font-mono text-muted-foreground" title={migration.id}>{migration.id.substring(0, 8)}...</td>
      <td className="p-4 align-middle font-medium">{migration.operation}</td>
      <td className="p-4 align-middle text-muted-foreground">{migration.objectType}</td>
      <td className="p-4 align-middle font-medium">{migration.objectName}</td>
      <td className="p-4 align-middle text-sm text-muted-foreground whitespace-nowrap">
        {formatDate(migration.createdAt)}
      </td>
      <td className="p-4 align-middle">
        <MigrationStatusBadge status={migration.status} />
      </td>
      <td className="p-4 align-middle text-right">
        {migration.rollbackSupported && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Rollbackable</span>}
      </td>
    </tr>
  )
}
