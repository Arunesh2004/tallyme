import * as React from "react"
import { FileText, CheckCircle2 } from "lucide-react"

export function StudentReasonList({ reasons }: { reasons: string[] }) {
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

export function StudentEvidenceCard({ studentMatch }: { studentMatch: any }) {
  return (
    <div className="border rounded-md p-4 bg-muted/20">
      <div className="flex items-center space-x-2 mb-4">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <h4 className="font-semibold">Extracted Data</h4>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground block">OCR Student Name</span>
          <span className="font-medium">{studentMatch.ocrStudentName || "N/A"}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">Roll Number</span>
          <span className="font-medium">{studentMatch.rollNumber || "N/A"}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">Fee Amount</span>
          <span className="font-medium">{studentMatch.amount || "N/A"}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">Class/Grade</span>
          <span className="font-medium">{studentMatch.grade || "N/A"}</span>
        </div>
      </div>
      
      {studentMatch.suggestedStudent && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-semibold text-sm mb-2">Suggested Match</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground block">ERP Student Name</span>
              <span className="font-medium">{studentMatch.suggestedStudent.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">ERP Roll No.</span>
              <span className="font-medium">{studentMatch.suggestedStudent.rollNumber || "N/A"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
