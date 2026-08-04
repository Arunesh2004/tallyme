import * as React from "react"
import { StudentConfidenceBadge } from "./student-confidence-badge"

export function StudentReviewRow({
  studentMatch,
  onReview,
}: {
  studentMatch: any
  onReview: (match: any) => void
}) {
  return (
    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
      <td className="p-4 align-middle font-medium">{studentMatch.receiptNumber}</td>
      <td className="p-4 align-middle">{studentMatch.date}</td>
      <td className="p-4 align-middle">{studentMatch.ocrStudentName}</td>
      <td className="p-4 align-middle text-muted-foreground">{studentMatch.rollNumber || "N/A"}</td>
      <td className="p-4 align-middle">
        <StudentConfidenceBadge score={studentMatch.matchConfidence} />
      </td>
      <td className="p-4 align-middle">{studentMatch.suggestedStudent?.name || "None"}</td>
      <td className="p-4 align-middle capitalize">{studentMatch.status?.replace(/_/g, ' ').toLowerCase() || "pending"}</td>
      <td className="p-4 align-middle">
        <button
          onClick={() => onReview(studentMatch)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-4 border"
        >
          Review
        </button>
      </td>
    </tr>
  )
}
