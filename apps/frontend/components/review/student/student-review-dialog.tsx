import * as React from "react"
import { StudentConfidenceBadge } from "./student-confidence-badge"
import { StudentEvidenceCard, StudentReasonList } from "./student-evidence-card"
import { StudentActionFooter } from "./student-action-footer"

export function StudentReviewDialog({
  studentMatch,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onChooseDifferent,
  isSubmitting,
}: {
  studentMatch: any
  isOpen: boolean
  onClose: () => void
  onApprove: (comment: string) => void
  onReject: () => void
  onChooseDifferent: () => void
  isSubmitting: boolean
}) {
  const [comment, setComment] = React.useState("")
  const [mode, setMode] = React.useState<"view" | "approve">("view")

  if (!isOpen || !studentMatch) return null;

  const handleApprove = () => {
    if (mode === "approve" && comment.length >= 10) {
      onApprove(comment)
    } else {
      setMode("approve")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-10">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-3xl p-6 relative max-h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold">Manual Review: {studentMatch.receiptNumber}</h2>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-sm text-muted-foreground">Confidence:</span>
              <StudentConfidenceBadge score={studentMatch.matchConfidence} />
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-2">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mb-6 pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <StudentEvidenceCard studentMatch={studentMatch} />
              <StudentReasonList reasons={studentMatch.reasons || ["OCR Name similarity is high", "Roll number matches"]} />
            </div>
            
            <div className="border rounded-md bg-muted/10 flex items-center justify-center min-h-[300px]">
              {/* Placeholder for actual receipt document viewer */}
              <span className="text-muted-foreground">Fee Receipt Document Preview Placeholder</span>
            </div>
          </div>

          {mode === "approve" && (
            <div className="mt-6 p-4 border rounded-md bg-muted/30">
              <label className="block text-sm font-medium mb-2">
                Approval Comment (Required)
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Enter at least 10 characters..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={3}
              />
              {comment.length > 0 && comment.length < 10 && (
                <p className="text-xs text-destructive mt-1">Comment must be at least 10 characters.</p>
              )}
            </div>
          )}
        </div>

        <StudentActionFooter 
          onApprove={handleApprove}
          onReject={onReject}
          onChooseDifferent={onChooseDifferent}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  )
}
