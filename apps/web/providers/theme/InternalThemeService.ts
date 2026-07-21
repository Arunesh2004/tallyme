import { Theme, ThemeService } from './ThemeService'

export class InternalThemeService implements ThemeService {
  private STORAGE_KEY = 'tallyme-theme'

  getTheme(): Theme {
    if (typeof window === 'undefined') return 'system'
    return (localStorage.getItem(this.STORAGE_KEY) as Theme) || 'system'
  }

  setTheme(theme: Theme): void {
    if (typeof window === 'undefined') return
    
    localStorage.setItem(this.STORAGE_KEY, theme)
    this.applyTheme(theme)
  }

  initialize(): void {
    if (typeof window === 'undefined') return
    
    const theme = this.getTheme()
    this.applyTheme(theme)
  }

  private applyTheme(theme: Theme): void {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }
}
