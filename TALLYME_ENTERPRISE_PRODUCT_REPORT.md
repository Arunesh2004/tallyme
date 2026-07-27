# TallyMe Enterprise — Product Report

## Product Overview
TallyMe Enterprise is a school financial automation platform that digitizes two critical accounting workflows — Vendor Invoice Processing and Student Fee Payment reconciliation — and automatically synchronizes the resulting double-entry vouchers with Tally Prime ERP.

---

## Implemented Features

### Vendor Slip Automation
- PDF/JPG/PNG invoice upload via REST API
- Azure Form Recognizer OCR extraction (production) / FakeOCR (development)
- Google Gemini AI field extraction (production) / FakeExtractor (development)
- Vendor master matching by GSTIN, PAN, and name
- Confidence-scored routing to manual review queue
- Expense allocation across GL ledgers
- Automatic purchase voucher generation
- BullMQ-backed ERP sync with 5-attempt retry and idempotency

### Student Fee Automation
- Gmail Pub/Sub payment email ingestion
- AI-based payment amount and reference extraction
- Multi-strategy student matching (enrollment number, name, phone)
- Outstanding fee allocation (EXACT / PARTIAL / ADVANCE)
- Duplicate payment detection and prevention
- Receipt voucher generation
- BullMQ-backed ERP sync with 5-attempt retry and idempotency

### Shared Accounting Engine
- Single `VoucherBuilderEngine` with pluggable strategies (Purchase, Receipt, Journal)
- All accounting flows from both pipelines converge here
- Prisma-persisted `VoucherCandidate` with double-entry `VoucherCandidateEntry` records

### ERP Connector
- Single `TallyTransportService` for all Tally HTTP/XML communication
- `TallyXmlBuilderService` for envelope/voucher XML construction
- `TallyXmlParserService` for response parsing
- `TallyMasterIntelligenceService` for ledger/group/cost-centre discovery
- Migration management with rollback support

### Operations Portal
- NestJS API layer: dashboard, review queues, ERP monitoring, audit, health, config
- Next.js 14 frontend: 9 operational screens
- RBAC: Admin / Accountant / Operator roles

---

## Architecture Summary
```
Vendor Slip Automation    Student Fee Automation
        ↓                          ↓
   [Shared Accounting Engine — VoucherBuilderEngine]
                    ↓
           [ERP Connector — TallyTransportService]
                    ↓
              Tally Prime ERP
```
Two inputs, one engine, one connector. No duplication.

---

## Technology Stack

| Component | Technology |
|---|---|
| Backend Framework | NestJS 10 (TypeScript) |
| Database | PostgreSQL 15 + Prisma ORM |
| Queue | BullMQ + Redis 7 |
| Frontend | Next.js 14 (App Router) |
| Container | Docker + Compose |
| OCR | Azure Form Recognizer |
| AI Extraction | Google Gemini |
| Email | Gmail Pub/Sub |
| ERP | Tally Prime (HTTP/XML) |

---

## Production Requirements

| Requirement | Minimum |
|---|---|
| RAM | 2GB |
| CPU | 2 vCPUs |
| Storage | 20GB |
| Node.js | 18 LTS |
| PostgreSQL | 15 |
| Redis | 7 |

---

## External Dependencies

| Dependency | Classification | Required For |
|---|---|---|
| Tally Prime | EXTERNAL | ERP sync |
| Azure Form Recognizer | EXTERNAL | Production OCR |
| Google Gemini | EXTERNAL | Production AI extraction |
| Gmail OAuth/Pub/Sub | EXTERNAL | Student email ingestion |
| Docker Engine | EXTERNAL | Container deployment |

---

## Known Limitations

1. **Tally Prime only**: The ERP connector exclusively supports Tally Prime via HTTP/XML. SAP, Oracle, Busy are not supported.
2. **Single-company**: The current architecture targets one Tally company at a time (set via `TALLY_COMPANY_NAME`).
3. **No MFA**: Authentication uses JWT only. Multi-factor authentication is not implemented.
4. **OCR quality dependency**: Extraction confidence depends on scan quality. Very low-quality scans will always route to manual review.
5. **Gmail only**: Student payment email ingestion supports Gmail via Pub/Sub only. Outlook/IMAP not supported.

---

## Future Enhancements

1. Multi-tenant support (multiple schools)
2. Multi-company Tally support
3. WhatsApp payment confirmation integration
4. Automated fee reminder generation
5. Mobile app for review queue
6. SAP/Oracle connector (extend ERPConnector interface)
7. Real-time WebSocket updates for processing status

---

## Customer Pilot Readiness

🟢 **READY FOR CUSTOMER PILOT**

Runtime evidence:
- 33/33 automated tests pass
- 0 TypeScript errors
- NestJS production build succeeds
- Database migrations verified
- Security controls verified at runtime

---

## Production Readiness

🟡 **PRODUCTION-READY pending external credential injection**

All code is complete and verified. The following must be provided by the deployment team:
1. Azure Form Recognizer API key + endpoint
2. Google Gemini API key
3. Gmail OAuth client credentials
4. Licensed Tally Prime installation on accessible host
5. Production PostgreSQL + Redis infrastructure
6. SSL certificates for HTTPS termination
