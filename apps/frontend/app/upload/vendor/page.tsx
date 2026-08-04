"use client"

import * as React from "react"
import { useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { PageContainer } from "@/components/ui/page"
import { useToast } from "@/components/providers/toast-provider"
import { UploadCloud, FileType, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function VendorUploadPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [file, setFile] = React.useState<File | null>(null)
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [isSuccess, setIsSuccess] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const uploadMutation = useMutation({
    mutationFn: async (uploadFile: File) => {
      const formData = new FormData()
      formData.append("file", uploadFile)
      
      const { data: uploadData } = await api.post("/files/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      
      // Trigger OCR pipeline
      const { data: ocrData } = await api.post(`/ocr/process/${uploadData.fileId}`)
      return { ...uploadData, ...ocrData }
    },
    onSuccess: () => {
      setIsSuccess(true)
      toast({ title: "Invoice uploaded successfully. Processing started.", type: "success" })
    },
    onError: (err: any) => {
      toast({ title: "Failed to upload invoice", message: err.message, type: "error" })
    }
  })

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const validateAndSetFile = (selectedFile: File) => {
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/tiff"]
    if (!validTypes.includes(selectedFile.type)) {
      toast({ title: "Invalid file format", message: "Only PDF, PNG, JPG, JPEG, and TIFF are supported.", type: "error" })
      return
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", message: "Maximum file size is 10 MB.", type: "error" })
      return
    }
    setFile(selectedFile)
    setIsSuccess(false)
  }

  const handleUpload = () => {
    if (!file) return
    uploadMutation.mutate(file)
  }

  const handleReset = () => {
    setFile(null)
    setIsSuccess(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Upload Vendor Invoice</h1>
        <p className="text-muted-foreground mt-1">
          Upload a vendor slip/invoice for automated OCR extraction and accounting processing.
        </p>
      </div>

      <div className="max-w-2xl mx-auto mt-8">
        {isSuccess ? (
          <div className="border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-900 rounded-lg p-8 text-center flex flex-col items-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-green-900 dark:text-green-300">
              Invoice uploaded successfully. Processing started.
            </h3>
            <p className="text-muted-foreground mb-6">
              The invoice has been sent to the OCR and Accounting Intelligence queues.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => router.push("/review/vendor")} 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
              >
                View Vendor Review Queue
              </button>
              <button 
                onClick={handleReset} 
                className="px-4 py-2 border rounded-md hover:bg-muted text-sm font-medium"
              >
                Upload Another Invoice
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
            <div
              className={`p-10 text-center border-b border-dashed border-border transition-colors ${
                isDragOver ? "bg-primary/5" : ""
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <UploadCloud className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Drag and drop your invoice here</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Supported formats: PDF, PNG, JPG, JPEG, TIFF (Max 10 MB)
              </p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.tiff,application/pdf,image/png,image/jpeg,image/tiff"
                onChange={handleFileChange}
              />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="px-4 py-2 border rounded-md hover:bg-muted text-sm font-medium"
              >
                Browse Files
              </button>
            </div>
            
            {file && (
              <div className="p-4 bg-muted/30 flex items-center justify-between">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="p-2 bg-primary/10 rounded">
                    <FileType className="w-5 h-5 text-primary" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    className="px-4 py-2 border rounded-md hover:bg-muted text-sm font-medium" 
                    onClick={handleReset} 
                    disabled={uploadMutation.isPending}
                  >
                    Cancel
                  </button>
                  <button 
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleUpload} 
                    disabled={uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? "Uploading..." : "Upload Invoice"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
