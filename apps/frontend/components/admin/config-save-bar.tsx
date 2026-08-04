import * as React from "react"
import { LoadingSpinner } from "@/components/ui/loading"

export function ConfigSaveBar({ 
  isDirty, 
  isSaving, 
  onSave, 
  onReset 
}: { 
  isDirty: boolean; 
  isSaving: boolean; 
  onSave: () => void; 
  onReset: () => void;
}) {
  if (!isDirty && !isSaving) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg z-50 animate-in slide-in-from-bottom-full flex justify-center">
      <div className="max-w-4xl w-full flex items-center justify-between">
        <p className="text-sm font-medium">You have unsaved changes.</p>
        <div className="flex space-x-3">
          <button 
            onClick={onReset}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted disabled:opacity-50"
          >
            Reset
          </button>
          <button 
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center"
          >
            {isSaving && <LoadingSpinner className="mr-2 h-4 w-4" />}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}
