"use client"

import * as React from "react"
import { Search } from "lucide-react"

export function StudentSearchBox({
  value,
  onChange,
  placeholder = "Search students...",
}: {
  value: string
  onChange: (val: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        placeholder={placeholder}
      />
    </div>
  )
}
