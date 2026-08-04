import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, FileSearch } from "lucide-react"

export function EmptyState({ title, description, className }: { title: string, description: string, className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-muted/20", className)}>
      <FileSearch className="h-10 w-10 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  )
}

export function ErrorState({ title, message, onRetry, className }: { title: string, message: string, onRetry?: () => void, className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center border border-destructive/20 rounded-lg bg-destructive/10 text-destructive", className)}>
      <AlertCircle className="h-10 w-10 mb-4" />
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-sm mt-1">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:bg-destructive/90">
          Try Again
        </button>
      )}
    </div>
  )
}

export const Section = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <section ref={ref} className={cn("space-y-4", className)} {...props} />
  )
)
Section.displayName = "Section"
