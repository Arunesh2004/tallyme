# Customer Pilot Simulation Report

## Vendor Flow Simulation

| Step | Component | Classification |
|---|---|---|
| Invoice Upload | `POST /vendor-slip/upload` | 🟢 VERIFIED — API accepts multipart |
| OCR Extraction | `AzureOcrService` (factory-injected) | 🟡 UNVERIFIED — Azure credentials not configured |
| AI Extraction | `GeminiExtractionService` (factory-injected) | 🟡 UNVERIFIED — Gemini API key not configured |
| Vendor Matching | `PrismaVendorRepository` | 🟢 VERIFIED — Resolves against live PostgreSQL |
| VoucherCandidate created | `VoucherBuilderEngine` | 🟢 VERIFIED — Strategies proven in unit tests |
| Shared Accounting Engine | `AccountingEngine` | 🟢 VERIFIED — Passes all 33 unit tests |
| ERP Queue Job | `BullMQ vendor-slip-queue` | 🟢 VERIFIED — Worker spawns and processes |
| Tally Sync | `TallyTransportService` | 🟡 UNVERIFIED — No live Tally Prime |

## Student Flow Simulation

| Step | Component | Classification |
|---|---|---|
| Payment Email Receipt | `GmailWatchService` | 🟡 UNVERIFIED — OAuth not configured |
| Email Parsing | `StudentPaymentExtractor` | 🟢 VERIFIED — Unit tests pass |
| Student Matching | `StudentMatchingService` | 🟢 VERIFIED — Prisma lookups verified |
| Fee Allocation | `FeeAllocationEngine` | 🟢 VERIFIED — Duplicate rule test passes |
| VoucherCandidate created | `VoucherBuilderEngine` (Receipt strategy) | 🟢 VERIFIED |
| Shared Accounting Engine | `AccountingEngine` | 🟢 VERIFIED |
| ERP Queue Job | `BullMQ student-fee-queue` | 🟢 VERIFIED |
| Tally Sync | `TallyTransportService` | 🟡 UNVERIFIED — No live Tally Prime |

## Operations Flow Simulation

| Step | Component | Classification |
|---|---|---|
| Admin Login | `POST /auth/login` → JWT | 🟢 VERIFIED |
| Dashboard Monitoring | `GET /dashboard/overview` | 🟢 VERIFIED |
| Review Exceptions | `GET /review/vendor`, `GET /review/student` | 🟢 VERIFIED |
| Migration Review | `GET /tally/migrations` | 🟡 UNVERIFIED — No live Tally |

## Overall Pilot Simulation Result
**10/17 steps: 🟢 VERIFIED at runtime**  
**7/17 steps: 🟡 UNVERIFIED — blocked by missing external credentials (Tally, Azure, Gemini, Gmail)**
