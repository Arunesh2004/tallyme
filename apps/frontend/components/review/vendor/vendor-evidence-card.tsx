import * as React from "react"
import { FileText, CheckCircle2 } from "lucide-react"

export function VendorReasonList({ reasons }: { reasons: string[] }) {
  if (!reasons || reasons.length === 0) return null;

  return (
    <div className="space-y-2 mt-4">
      <h4 className="text-sm font-semibold">Match Evidence & Reasons</h4>
      <ul className="space-y-1">
        {reasons.map((reason, idx) => (
          <li key={idx} className="flex items-start text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 mt-0.5 shrink-0" />
            <span>{reason}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function VendorEvidenceCard({ invoice }: { invoice: any }) {
  return (
    <div className="border rounded-md p-4 bg-muted/20">
      <div className="flex items-center space-x-2 mb-4">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <h4 className="font-semibold">Extracted Data</h4>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground block">OCR Vendor Name</span>
          <span className="font-medium">{invoice.extractedName || "N/A"}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">Extracted GSTIN</span>
          <span className="font-medium">{invoice.extractedGstin || "N/A"}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">Invoice Amount</span>
          <span className="font-medium">{invoice.total || "N/A"}</span>
        </div>
      </div>
      
      {invoice.suggestedVendor && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-semibold text-sm mb-2">Suggested Match</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground block">ERP Vendor Name</span>
              <span className="font-medium">{invoice.suggestedVendor.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">ERP GSTIN</span>
              <span className="font-medium">{invoice.suggestedVendor.gstin || "N/A"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
