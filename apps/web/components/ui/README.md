# TallyMe Enterprise Design System (UI Primitives)

This directory contains the foundational, highly-reusable UI components for the TallyMe application. These primitives form the bedrock of the Enterprise Design System.

## Principles

- **Separation of Concerns:** Components here contain **zero business logic**. They are strictly presentation layers.
- **Composition:** We use compound component patterns (e.g., `Card`, `CardHeader`, `CardTitle`) to maximize flexibility without bloated props APIs.
- **Accessibility (a11y):** All components must meet WCAG 2.1 AA standards, utilizing Radix UI primitives under the hood to handle ARIA attributes and keyboard focus management natively.

## Naming Conventions
- Component files are written in `kebab-case.tsx` (e.g. `button.tsx`, `alert-dialog.tsx`) to align with shadcn/ui CLI conventions.
- Exported components are always `PascalCase`.

## Variants and Styling
We utilize `class-variance-authority` (cva) in combination with Tailwind CSS to manage stateful styles.
- **Design Tokens:** All colors, spacing, and radii reference CSS variables mapped in `tailwind.config.ts` (e.g., `bg-primary`, `text-muted-foreground`). Hardcoded values are forbidden.
- **Utility Merging:** The custom `cn()` utility (`clsx` + `tailwind-merge`) is always used to allow consumers to safely override classes without specificity conflicts.

## Example Usage

### Button
```tsx
import { Button } from "@/components/ui/button"

export function Example() {
  return (
    <Button variant="destructive" size="lg" isLoading>
      Delete Package
    </Button>
  )
}
```

### Card
```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Status</CardTitle>
      </CardHeader>
      <CardContent>
        All services are operational.
      </CardContent>
    </Card>
  )
}
```
