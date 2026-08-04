import * as React from "react"
import { VendorConfidenceBadge } from "./vendor-confidence-badge"

export function VendorReviewDialog({
  invoice,
  isOpen,
  onClose,
  onApprove,
  onReject,
  isSubmitting,
  readinessResult // NEW: Pass the readiness result from backend
}: {
  invoice: any
  isOpen: boolean
  onClose: () => void
  onApprove: (comment: string) => void
  onReject: (comment: string) => void
  onChooseDifferent?: () => void
  isSubmitting: boolean
  readinessResult?: any // From backend Readiness Engine
}) {
  const [comment, setComment] = React.useState("")
  const [mode, setMode] = React.useState<"view" | "reject" | "approve">("view")

  if (!isOpen || !invoice) return null;

  const isReady = readinessResult?.isReady || false;
  
  // Use backend data if available, otherwise fallback to empty state
  const extractedFields = invoice?.extractedFields || ["Invoice Number", "Invoice Date"];
  const aiSuggestions = readinessResult?.suggestions?.filter((s: any) => s.source === 'AI') || [];
  const historicalSuggestions = readinessResult?.suggestions?.filter((s: any) => s.source === 'HISTORICAL') || [];
  const missingFields = readinessResult?.missingRequiredFields || [];
  const gates = readinessResult?.gates || {
    structural: { pass: false },
    business: { pass: false },
    erp: { pass: false },
    userCompletion: { pass: false }
  };

  const handleApprove = () => {
    if (mode === "approve") {
      onApprove(comment || "Approved via Smart Wizard")
    } else {
      setMode("approve")
    }
  }

  const handleReject = () => {
    if (mode === "reject" && comment.length >= 10) {
      onReject(comment)
    } else {
      setMode("reject")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-10">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-5xl p-6 relative max-h-full flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold">Smart Voucher Completion Wizard</h2>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-sm text-muted-foreground">Draft: {invoice.invoiceNumber || invoice.id}</span>
              <VendorConfidenceBadge score={invoice.matchConfidence || 85} />
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-2 text-2xl">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mb-6 pr-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Column: Invoice & Suggestions */}
            <div className="col-span-1 md:col-span-1 space-y-6">
              
              {/* Section 1: Extracted Data (Green) */}
              <div className="border border-green-200 bg-green-50/50 p-4 rounded-md">
                <h3 className="font-semibold text-green-800 mb-3 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                  Invoice Data
                </h3>
                <ul className="space-y-2 text-sm">
                  {extractedFields.map((f: string) => (
                    <li key={f} className="flex justify-between">
                      <span className="text-muted-foreground">{f}</span>
                      <span className="font-medium text-green-700">✓</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Section 2: AI Suggestions (Blue) */}
              <div className="border border-blue-200 bg-blue-50/50 p-4 rounded-md">
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                  AI Suggestions
                </h3>
                {aiSuggestions.length === 0 && <span className="text-xs text-slate-500">None available</span>}
                <ul className="space-y-2 text-sm">
                  {aiSuggestions.map((s: any, i: number) => (
                    <li key={i} className="flex justify-between items-center bg-white p-2 border rounded">
                      <span className="text-blue-900">{s.field}: <b>{s.suggestedValue}</b></span>
                      <button className="text-blue-600 hover:underline text-xs">Edit</button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Section 3: Historical Suggestions (Purple) */}
              <div className="border border-purple-200 bg-purple-50/50 p-4 rounded-md">
                <h3 className="font-semibold text-purple-800 mb-3 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                  Historical Intelligence
                </h3>
                {historicalSuggestions.length === 0 && <span className="text-xs text-slate-500">None available</span>}
                <ul className="space-y-2 text-sm">
                  {historicalSuggestions.map((s: any, i: number) => (
                    <li key={i} className="flex justify-between items-center bg-white p-2 border rounded">
                      <span className="text-purple-900">{s.field}: <b>{s.suggestedValue}</b></span>
                      <button className="text-purple-600 hover:underline text-xs">Edit</button>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
            
            {/* Middle Column: Document */}
            <div className="col-span-1 md:col-span-1 flex flex-col min-h-[400px]">
              <div className="border rounded-md bg-muted/10 flex items-center justify-center flex-1 overflow-hidden">
                {invoice?.document?.fileUrl ? (
                  <iframe 
                    src={invoice.document.fileUrl} 
                    title="Invoice Document Preview"
                    className="w-full h-full border-0"
                  />
                ) : (
                  <span className="text-muted-foreground">No Document Available</span>
                )}
              </div>
            </div>

            {/* Right Column: Missing & Readiness */}
            <div className="col-span-1 md:col-span-1 space-y-6">
              
              {/* Section 4: Missing Required Fields (Red) */}
              <div className="border border-red-200 bg-red-50/50 p-4 rounded-md">
                <h3 className="font-semibold text-red-800 mb-3 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                  Missing Required Fields
                </h3>
                {missingFields.length > 0 ? (
                  <ul className="space-y-3 text-sm">
                    {missingFields.map((f: string) => (
                      <li key={f} className="flex justify-between items-center bg-white p-2 border border-red-200 rounded">
                        <span className="font-medium text-red-900">{f}</span>
                        <button className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs hover:bg-red-200">Fill</button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-green-700">All required fields present</div>
                )}
              </div>

              {/* Section 5: Readiness Gates */}
              <div className="border border-slate-200 bg-slate-50 p-4 rounded-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">Validation Gates</h3>
                  <span className={`px-2 py-1 text-xs font-bold rounded ${isReady ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                    {isReady ? 'READY TO SYNC' : 'INCOMPLETE'}
                  </span>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span>Structural</span>
                    {gates.structural.pass ? <span className="text-green-600 font-medium">✓ PASS</span> : <span className="text-red-600 font-medium">✕ FAIL</span>}
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span>Business</span>
                    {gates.business.pass ? <span className="text-green-600 font-medium">✓ PASS</span> : <span className="text-red-600 font-medium">✕ FAIL</span>}
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span>ERP Capability</span>
                    {gates.erp.pass ? <span className="text-green-600 font-medium">✓ PASS</span> : <span className="text-red-600 font-medium">✕ FAIL</span>}
                  </div>
                  <div className="flex justify-between items-center">
                    <span>User Completion</span>
                    {gates.userCompletion.pass ? <span className="text-green-600 font-medium">✓ PASS</span> : <span className="text-red-600 font-medium">✕ FAIL</span>}
                  </div>
                </div>
              </div>

            </div>

          </div>

          {(mode === "reject" || mode === "approve") && (
            <div className="mt-6 p-4 border rounded-md bg-muted/30">
              <label className="block text-sm font-medium mb-2">
                {mode === "approve" ? "Approval Comment (Optional)" : "Rejection Reason (Required)"}
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={mode === "approve" ? "Looks good..." : "Enter at least 10 characters..."}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={3}
              />
              {mode === "reject" && comment.length > 0 && comment.length < 10 && (
                <p className="text-xs text-destructive mt-1">Comment must be at least 10 characters.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4 border-t pt-4">
          <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-slate-50">
            Cancel
          </button>
          {mode !== "reject" && (
            <button 
              onClick={handleReject} 
              className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100"
            >
              Reject Draft
            </button>
          )}
          <button 
            onClick={handleApprove} 
            disabled={!isReady && mode === 'approve'}
            className={`px-6 py-2 rounded font-medium text-white ${!isReady ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {mode === 'approve' ? 'Confirm Approval' : 'Approve & Create Voucher'}
          </button>
        </div>
      </div>
    </div>
  )
}
