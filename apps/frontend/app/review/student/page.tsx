"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { PageContainer } from "@/components/ui/page"
import { ErrorState } from "@/components/ui/states"
import { LoadingSpinner } from "@/components/ui/loading"
import { RefreshButton } from "@/components/dashboard/refresh-button"
import { useToast } from "@/components/providers/toast-provider"

import { StudentReviewTable } from "@/components/review/student/student-review-table"
import { StudentSearchBox } from "@/components/review/student/student-search-box"
import { StudentReviewDialog } from "@/components/review/student/student-review-dialog"

export default function StudentReviewPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedMatch, setSelectedMatch] = React.useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  // Fetch pending review student fee receipts
  const { data: students, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['student-reviews'],
    queryFn: async () => {
      const { data } = await api.get('/review/student')
      return data || []
    },
  })

  const filteredStudents = React.useMemo(() => {
    if (!students) return []
    if (!searchTerm) return students
    const lowerSearch = searchTerm.toLowerCase()
    return students.filter((match: any) => 
      (match.ocrStudentName && match.ocrStudentName.toLowerCase().includes(lowerSearch)) ||
      (match.receiptNumber && match.receiptNumber.toLowerCase().includes(lowerSearch)) ||
      (match.rollNumber && match.rollNumber.toLowerCase().includes(lowerSearch))
    )
  }, [students, searchTerm])

  const handleReview = (match: any) => {
    setSelectedMatch(match)
    setIsDialogOpen(true)
  }

  const showUnavailableToast = () => {
    toast({ 
      title: "Action Disabled", 
      message: "Student review workflow is not yet available in the current backend contract.", 
      type: "default" 
    })
    setIsDialogOpen(false)
  }

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Student Manual Review</h1>
          <p className="text-muted-foreground mt-1">Triage and resolve unconfident student fee mappings</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <StudentSearchBox value={searchTerm} onChange={setSearchTerm} />
          <RefreshButton onRefresh={refetch} isRefreshing={isFetching} />
        </div>
      </div>

      {error ? (
        <ErrorState title="Failed to load review queue" message={(error as any).message} onRetry={refetch} />
      ) : isLoading ? (
        <div className="flex justify-center items-center h-64 border rounded-lg bg-card text-muted-foreground">
          <LoadingSpinner className="mr-3" /> Loading review queue...
        </div>
      ) : (
        <StudentReviewTable students={filteredStudents} onReview={handleReview} />
      )}

      {selectedMatch && (
        <StudentReviewDialog 
          studentMatch={selectedMatch}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          isSubmitting={false}
          onApprove={(comment) => {
            showUnavailableToast()
          }}
          onReject={() => {
            showUnavailableToast()
          }}
          onChooseDifferent={() => {
            showUnavailableToast()
          }}
        />
      )}
    </PageContainer>
  )
}
