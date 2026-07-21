# Post-Installation Verification Checklist

These verification steps must be executed immediately after the `npm install` timeout issue resolves and the `node_modules` directory is successfully populated.

## 1. Verify Dependencies
Run:
```bash
ls apps/web/node_modules/.bin
```
Confirm the following executables are present:
- `next`
- `tsc`
- `eslint`

## 2. Linting
Run:
```bash
npm run lint
```
**Acceptance:** Command completes with zero errors. Resolves any import ordering or unused variable warnings.

## 3. Type Checking
Run:
```bash
npm run typecheck
```
**Acceptance:** Command completes with zero errors. Confirms that all `Button`, `Badge`, and `Card` variant props are fully typesafe and aligned with `class-variance-authority`.

## 4. Production Build
Run:
```bash
npm run build
```
**Acceptance:** Next.js successfully compiles the app router, resolves all absolute path aliases (`@/*`), and generates the `.next` output directory without encountering Server/Client Component boundary violations.

## 5. Runtime Verification
Run:
```bash
npm run dev
```
Open `http://localhost:3000/design-system` and verify:
- Development server starts successfully.
- No runtime exceptions occur.
- No hydration warnings appear in the browser console.
- Global styles and `tailwind.config.ts` design tokens load correctly.
- The `Button`, `Badge`, and `Card` components render visually with their respective variants.
