'use client'

import * as React from 'react'
import { ThemeContext } from './ThemeContext'
import { InternalThemeService } from './InternalThemeService'
import { Theme } from './ThemeService'

// Dependency injection point. This could be swapped for NextThemesService later.
const themeService = new InternalThemeService()

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>('system')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    themeService.initialize()
    setThemeState(themeService.getTheme())
    setMounted(true)
  }, [])

  const setTheme = React.useCallback((newTheme: Theme) => {
    themeService.setTheme(newTheme)
    setThemeState(newTheme)
  }, [])

  const value = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  // Prevent hydration mismatch flashes
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
