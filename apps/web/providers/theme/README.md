# Theme Provider Architecture

This directory implements the TallyMe theme switching infrastructure. 

## Why the internal implementation exists?
Next.js 15 requires React 19, and the standard ecosystem package `next-themes` currently relies on a stale peer dependency of React 16-18. While it is theoretically runtime compatible with React 19, forcing the package installation via strict mode overrides compromises our zero-conflict clean dependency graph requirement. 

Therefore, we use a lightweight internal `InternalThemeService` as an adapter pattern.

## Replacing with NextThemesService Later
The application components consume the `ThemeContext` via the `useTheme()` hook, keeping them completely ignorant of the underlying service implementation.

When `next-themes` officially supports React 19:
1. Create `NextThemesService.ts` implementing `ThemeService`.
2. Update `ThemeProvider.tsx` to instantiate `NextThemesService` instead of `InternalThemeService`.
3. No other component in the codebase will need to change.

## Public API
- `ThemeProvider`: Wraps the application layout.
- `useTheme()`: Returns `{ theme: Theme, setTheme: (theme: Theme) => void }`
- `Theme`: Type definition (`dark` | `light` | `system`).
