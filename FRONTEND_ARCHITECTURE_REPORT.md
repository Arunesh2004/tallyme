# Frontend Architecture Report

## Framework Selection
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Data Fetching**: Axios + TanStack React Query

## Folder Structure
```
apps/frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── vendor-review/
│   │   │   ├── student-review/
│   │   │   ├── erp-monitoring/
│   │   │   ├── tally-migration/
│   │   │   ├── audit/
│   │   │   ├── configuration/
│   │   │   └── system-health/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/ (shadcn)
│   │   ├── tables/
│   │   └── status/
│   └── lib/
│       └── api-client.ts
```

## API Communication Strategy
All HTTP GET/POST calls to the NestJS backend route through an Axios interceptor resolving `NEXT_PUBLIC_API_URL`. If the network fails, `ErrorState` components intrinsically render `UNVERIFIED` for the given dataset, enforcing strict decoupling.
