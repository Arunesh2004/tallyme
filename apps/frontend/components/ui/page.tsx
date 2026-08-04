import * as React from "react"
import { cn } from "@/lib/utils"

const PageContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 max-w-7xl mx-auto w-full space-y-6", className)} {...props} />
  )
)
PageContainer.displayName = "PageContainer"

const PageHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center justify-between", className)} {...props} />
  )
)
PageHeader.displayName = "PageHeader"

export { PageContainer, PageHeader }
