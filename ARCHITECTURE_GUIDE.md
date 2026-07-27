# TallyMe Enterprise — Architecture Guide

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    TallyMe Enterprise                             │
│                                                                   │
│  ┌─────────────────┐      ┌──────────────────────────────────┐  │
│  │  Vendor Slip    │      │     Student Fee Automation        │  │
│  │  Automation     │      │                                   │  │
│  │                 │      │  Gmail Watch API                  │  │
│  │  File Upload    │      │       ↓                           │  │
│  │       ↓         │      │  EmailDocument                    │  │
│  │  OCR Provider   │      │       ↓                           │  │
│  │  (Azure/Fake)   │      │  AI Extraction                    │  │
│  │       ↓         │      │       ↓                           │  │
│  │  AI Extractor   │      │  StudentPaymentCandidate          │  │
│  │  (Gemini/Fake)  │      │       ↓                           │  │
│  │       ↓         │      │  Student Matching                 │  │
│  │  InvoiceCandidate│     │       ↓                           │  │
│  │       ↓         │      │  FeeAllocationCandidate           │  │
│  │  Vendor Matcher │      │       ↓                           │  │
│  └────────┬────────┘      └───────────┬──────────────────────┘  │
│           │                           │                           │
│           └──────────┬────────────────┘                          │
│                      ↓                                            │
│          ┌───────────────────────┐                               │
│          │  Shared Accounting    │  ← SINGLE ENGINE              │
│          │       Engine          │                               │
│          │  VoucherBuilderEngine │                               │
│          │  (Purchase/Receipt    │                               │
│          │   /Journal strategies)│                               │
│          └───────────┬───────────┘                               │
│                      ↓                                            │
│          ┌───────────────────────┐                               │
│          │    ERP Connector      │  ← SINGLE CONNECTOR           │
│          │  TallyTransportService│                               │
│          │  TallyXmlBuilderSvc   │                               │
│          │  BullMQ Retry Queue   │                               │
│          └───────────┬───────────┘                               │
│                      ↓                                            │
│                 Tally Prime                                        │
└──────────────────────────────────────────────────────────────────┘

Infrastructure:
PostgreSQL ← Prisma ORM ← All domain data
Redis      ← BullMQ     ← Queue persistence
```

---

## Vendor Invoice Sequence Diagram

```
Client          OCRController     OCRCoordinator   AzureOcrService  InvoiceExtractor  VendorMatcher  VoucherBuilderEngine  AccountingEngine  ERPConnector  Tally
  │                  │                  │                 │                │                │                  │                   │              │          │
  │──POST /upload──▶ │                  │                 │                │                │                  │                   │              │          │
  │                  │──processDoc()──▶ │                 │                │                │                  │                   │              │          │
  │                  │                  │──extractText()─▶│                │                │                  │                   │              │          │
  │                  │                  │◀───rawText───── │                │                │                  │                   │              │          │
  │                  │                  │──extract()────────────────────▶ │                │                  │                   │              │          │
  │                  │                  │◀──InvoiceCandidate──────────────│                │                  │                   │              │          │
  │                  │                  │──match()──────────────────────────────────────▶ │                  │                   │              │          │
  │                  │                  │◀──VendorMatch──────────────────────────────────│                  │                   │              │          │
  │                  │                  │──buildVoucher()──────────────────────────────────────────────────▶│                   │              │          │
  │                  │                  │◀──VoucherCandidate───────────────────────────────────────────────│                   │              │          │
  │                  │                  │──process()────────────────────────────────────────────────────────────────────────▶ │              │          │
  │                  │                  │◀──ERPSyncJob──────────────────────────────────────────────────────────────────────│              │          │
  │                  │                  │                 │                │                │                  │              ──sendXML()──▶  │          │
  │                  │                  │                 │                │                │                  │              │◀──response─── │          │
  │◀──202 Accepted── │                  │                 │                │                │                  │                   │              │          │
```

---

## Student Payment Sequence Diagram

```
Gmail PubSub   MailController   StudentFeeService  StudentMatcher  FeeAllocator  VoucherBuilderEngine  AccountingEngine  ERPConnector  Tally
     │               │                  │                │               │                │                   │              │          │
     │──webhook()──▶ │                  │                │               │                │                   │              │          │
     │               │──processEmail()─▶│                │               │                │                   │              │          │
     │               │                  │──matchStudent()▶               │                │                   │              │          │
     │               │                  │◀──StudentMatch──               │                │                   │              │          │
     │               │                  │──allocateFees()────────────────▶               │                   │              │          │
     │               │                  │◀──FeeAllocationCandidate────────               │                   │              │          │
     │               │                  │──buildVoucher()─────────────────────────────▶ │                   │              │          │
     │               │                  │◀──VoucherCandidate(Receipt)──────────────────│                   │              │          │
     │               │                  │──process()──────────────────────────────────────────────────────▶│              │          │
     │               │                  │                 │               │                │              ──sendXML()──▶  │          │
     │◀──200 OK───── │                  │                 │               │                │              │◀──response─── │          │
```

---

## Module Reference

| Module | Responsibility |
|---|---|
| `vendor-slip` | Vendor invoice upload, OCR, extraction, matching |
| `voucher-builder` | Shared VoucherCandidate building (Purchase/Receipt/Journal) |
| `erp-connector` | Tally XML generation, transport, retry queue |
| `student-fee` | Student payment orchestration |
| `student-matching` | Admission number / fuzzy name matching |
| `fee-validation` | Duplicate detection, allocation rules |
| `fee-automation` | Email processing workers |
| `mail` | Gmail Watch setup and webhook handling |
| `payment-parser` | AI-based payment amount/ref extraction |
| `operations` | System health, dashboard, capabilities |
| `operations-portal` | Review queue, audit, migration endpoints |
| `auth` | JWT authentication, RBAC |
| `health` | NestJS Terminus health checks |
| `files` | File upload handling and security |

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | ≥18 LTS |
| Framework | NestJS | 10.x |
| Language | TypeScript | 5.x |
| ORM | Prisma | 5.22 |
| Database | PostgreSQL | 15 |
| Queue | BullMQ + Redis | Redis 7 |
| Container | Docker + Compose | v3.8 |
| Frontend | Next.js | 14+ |
| OCR | Azure Form Recognizer | UNVERIFIED |
| AI | Google Gemini | UNVERIFIED |
| Mail | Gmail Pub/Sub | UNVERIFIED |
| ERP | Tally Prime | UNVERIFIED |
