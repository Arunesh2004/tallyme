import * as React from "react"
import { VendorReviewRow } from "./vendor-review-row"
import { EmptyState } from "@/components/ui/states"

export function VendorReviewTable({
  invoices,
  onReview,
}: {
  invoices: any[]
  onReview: (invoice: any) => void
}) {
  if (!invoices || invoices.length === 0) {
    return <EmptyState title="No pending reviews" description="There are no vendor slips requiring manual triage." />
  }

  return (
    <div className="rounded-md border overflow-x-auto bg-card">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b bg-muted/50">
          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Invoice Number</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Invoice Date</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Vendor Name (OCR)</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">GSTIN</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Match Confidence</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Suggested Vendor</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {invoices.map((inv) => (
            <VendorReviewRow key={inv.id || inv.invoiceCandidateId} invoice={inv} onReview={onReview} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
