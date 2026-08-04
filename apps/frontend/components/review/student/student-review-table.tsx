import * as React from "react"
import { StudentReviewRow } from "./student-review-row"
import { EmptyState } from "@/components/ui/states"

export function StudentReviewTable({
  students,
  onReview,
}: {
  students: any[]
  onReview: (match: any) => void
}) {
  if (!students || students.length === 0) {
    return <EmptyState title="No pending reviews" description="There are no student fee receipts requiring manual triage." />
  }

  return (
    <div className="rounded-md border overflow-x-auto bg-card">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b bg-muted/50">
          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Receipt Number</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Student Name (OCR)</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Roll No.</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Match Confidence</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Suggested Student</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {students.map((match) => (
            <StudentReviewRow key={match.id || match.receiptCandidateId} studentMatch={match} onReview={onReview} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
