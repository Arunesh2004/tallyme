import * as React from "react"
import { VendorConfidenceBadge } from "./vendor-confidence-badge"

export function VendorReviewRow({
  invoice,
  onReview,
}: {
  invoice: any
  onReview: (invoice: any) => void
}) {
  return (
    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
      <td className="p-4 align-middle font-medium">{invoice.invoiceNumber}</td>
      <td className="p-4 align-middle">{invoice.invoiceDate}</td>
      <td className="p-4 align-middle">{invoice.ocrVendorName}</td>
      <td className="p-4 align-middle text-muted-foreground">{invoice.gstin || "N/A"}</td>
      <td className="p-4 align-middle">
        <VendorConfidenceBadge score={invoice.matchConfidence} />
      </td>
      <td className="p-4 align-middle">{invoice.suggestedVendor?.name || "None"}</td>
      <td className="p-4 align-middle capitalize">{invoice.status.replace(/_/g, ' ').toLowerCase()}</td>
      <td className="p-4 align-middle">
        <button
          onClick={() => onReview(invoice)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-4 border"
        >
          Review
        </button>
      </td>
    </tr>
  )
}
