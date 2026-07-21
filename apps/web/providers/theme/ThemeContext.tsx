'use client'

import * as React from 'react'
import { Theme } from './ThemeService'

export type ThemeContextType = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = React.createContext<ThemeContextType | undefined>(
  undefined
)

export const useTheme = () => {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
