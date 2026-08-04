import * as React from "react"

export function StudentActionFooter({
  onApprove,
  onReject,
  onChooseDifferent,
  isSubmitting,
}: {
  onApprove: () => void
  onReject: () => void
  onChooseDifferent: () => void
  isSubmitting: boolean
}) {
  return (
    <div className="flex items-center justify-between mt-6 pt-6 border-t">
      <button
        onClick={onReject}
        disabled={isSubmitting}
        className="px-4 py-2 border border-destructive text-destructive rounded-md text-sm font-medium hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
      >
        Reject
      </button>
      
      <div className="flex space-x-3">
        <button
          onClick={onChooseDifferent}
          disabled={isSubmitting}
          className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          Choose Different Student
        </button>
        <button
          onClick={onApprove}
          disabled={isSubmitting}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 cursor-not-allowed opacity-50"
          title="Workflow not available"
        >
          Approve Suggested
        </button>
      </div>
    </div>
  )
}
