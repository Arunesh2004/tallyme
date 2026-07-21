'use client'

import * as React from 'react'
import { ThemeProvider } from './theme'
import { QueryProvider } from './QueryProvider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        {children}
      </QueryProvider>
    </ThemeProvider>
  )
}
