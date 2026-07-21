export type Theme = 'dark' | 'light' | 'system'

export interface ThemeService {
  getTheme(): Theme
  setTheme(theme: Theme): void
  initialize(): void
}
