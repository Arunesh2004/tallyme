import * as React from "react"
import { ERPHistoryRow } from "./erp-history-row"
import { EmptyState } from "@/components/ui/states"

export function ERPHistoryTable({ historyList }: { historyList: any[] }) {
  if (!historyList || historyList.length === 0) {
    return <EmptyState title="No History Found" description="There are no recent ERP synchronization events." />
  }

  return (
    <div className="rounded-md border overflow-x-auto bg-card shadow-sm">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b bg-muted/50">
          <tr className="border-b transition-colors hover:bg-muted/50">
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[100px]">ID</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[100px]">Job ID</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">From Status</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">To Status</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground max-w-[200px]">Reason</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Timestamp</th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {historyList.map((entry) => (
            <ERPHistoryRow key={entry.id} historyEntry={entry} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
