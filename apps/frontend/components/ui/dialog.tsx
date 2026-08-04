import * as React from "react"
import { cn } from "@/lib/utils"

export function ConfirmDialog({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex justify-end space-x-2">
          <button onClick={onCancel} className="px-4 py-2 border rounded-md hover:bg-muted text-sm font-medium">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
