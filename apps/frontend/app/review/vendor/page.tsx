"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { PageContainer } from "@/components/ui/page"
import { ErrorState } from "@/components/ui/states"
import { LoadingSpinner } from "@/components/ui/loading"
import { RefreshButton } from "@/components/dashboard/refresh-button"
import { useToast } from "@/components/providers/toast-provider"

import { VendorReviewTable } from "@/components/review/vendor/vendor-review-table"
import { VendorSearchBox } from "@/components/review/vendor/vendor-search-box"
import { VendorReviewDialog } from "@/components/review/vendor/vendor-review-dialog"

export default function VendorReviewPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedInvoice, setSelectedInvoice] = React.useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  // Fetch pending review invoices
  const { data: invoices, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['vendor-reviews'],
    queryFn: async () => {
      const { data } = await api.get('/review/vendor')
      return data?.data || []
    },
  })

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ invoiceCandidateId, vendorBranchId, comment }: { invoiceCandidateId: string, vendorBranchId: string, comment: string }) => {
      const { data } = await api.post('/vmms/review/approve', {
        invoiceCandidateId,
        vendorBranchId,
        comment
      })
      return data
    },
    onSuccess: () => {
      toast({ title: "Approved successfully", type: "success" })
      queryClient.invalidateQueries({ queryKey: ['vendor-reviews'] })
      setIsDialogOpen(false)
    },
    onError: (err: any) => {
      toast({ title: "Failed to approve", message: err.message, type: "error" })
    }
  })



  const filteredInvoices = React.useMemo(() => {
    if (!invoices) return []
    if (!searchTerm) return invoices
    const lowerSearch = searchTerm.toLowerCase()
    return invoices.filter((inv: any) => 
      (inv.ocrVendorName && inv.ocrVendorName.toLowerCase().includes(lowerSearch)) ||
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(lowerSearch))
    )
  }, [invoices, searchTerm])

  const handleReview = (invoice: any) => {
    setSelectedInvoice(invoice)
    setIsDialogOpen(true)
  }

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Vendor Manual Review</h1>
          <p className="text-muted-foreground mt-1">Triage and resolve unconfident vendor mappings</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <VendorSearchBox value={searchTerm} onChange={setSearchTerm} />
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
        <VendorReviewTable invoices={filteredInvoices} onReview={handleReview} />
      )}

      {selectedInvoice && (
        <VendorReviewDialog 
          invoice={selectedInvoice}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          isSubmitting={approveMutation.isPending}
          onApprove={(comment) => approveMutation.mutate({ 
            invoiceCandidateId: selectedInvoice.id || selectedInvoice.invoiceCandidateId, 
            vendorBranchId: selectedInvoice.suggestedVendor?.id || "unknown", 
            comment 
          })}
          onReject={() => {
            toast({ title: "Reject workflow is not yet available in the current backend contract.", type: "default" })
            setIsDialogOpen(false)
          }}
          onChooseDifferent={() => {
            toast({ title: "Choose different vendor", message: "Search existing vendors list (Mocked)", type: "default" })
          }}
        />
      )}
    </PageContainer>
  )
}
