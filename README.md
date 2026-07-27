# TallyMe Enterprise

TallyMe Enterprise is an enterprise accounting automation platform featuring robust workflow orchestration, real-time Tally Prime synchronization, and automated document processing via OCR/AI.

## ?? Local Setup

### Prerequisites
- Node.js >= 18
- PostgreSQL >= 14
- Redis >= 6
- Tally Prime (running on port 9000 with XML API enabled)

### Installation
1. Clone the repository and install dependencies using pnpm or npm:
   pnpm install

2. Configure environment variables:
   Copy the example environment files and update them with your local credentials.
   cp apps/backend/.env.example apps/backend/.env
   cp apps/web/.env.example apps/web/.env

3. Initialize the Database:
   cd apps/backend
   npx prisma db push
   npm run prisma:seed

4. Start the Application:
   npm run dev

## ?? Test Execution

The platform maintains a comprehensive suite of unit and live integration tests.

### Run All Tests
To execute all tests across the monorepo:
npm run test

*Note: Ensure Redis and PostgreSQL are running, as the ERP Connector and Fee Validator integration tests rely on real BullMQ queues and Prisma clients.*

## ?? Docker / K8s Deployment

TallyMe Enterprise is containerized and ready for Kubernetes orchestration.

### Docker Compose
docker-compose up --build -d

### Kubernetes
The platform is designed to run in a distributed environment:
- **API Server:** Mounts to /api/v1 serving the NestJS Core.
- **Worker Nodes:** Start the backend with WORKER_MODE=true node dist/main to enable horizontal scaling of BullMQ orchestration consumers without exposing an HTTP port.
- **Liveness/Readiness Checks:** Configured natively at /api/v1/liveness and /api/v1/readiness for seamless rolling deployments.
- **Metrics:** Prometheus metrics are exported at /api/v1/metrics.

## ?? API Documentation

Once the backend is running, the OpenAPI / Swagger documentation is available at:
http://localhost:3000/api/v1/docs

---

## Current Development Status

### Architecture - Two Mandatory Business Pipelines

Both pipelines converge into a **Shared Accounting Engine**. No accounting logic, voucher generation, or ERP communication may be duplicated outside of this engine.

#### Pipeline 1 - Vendor Invoice Automation

`
Email Attachment / Upload
  -> OCR (Gemini Vision / Azure Cognitive Services)
  -> AI Extraction (vendor name, amount, date, invoice number)
  -> Validation (duplicate check, ledger resolution)
  -> Voucher Builder (Purchase Voucher)
  -> Shared Accounting Engine
  -> Tally XML Builder
  -> Tally Prime HTTP Import (port 9000)
`

#### Pipeline 2 - Student Fee Automation

`
Gmail / Payment Gateway Notification
  -> Payment Parser (Razorpay / generic format)
  -> Student Matching (name, roll number, amount)
  -> Fee Allocation (advance, partial, full payment rules)
  -> Receipt Voucher Builder
  -> Shared Accounting Engine
  -> Tally XML Builder
  -> Tally Prime HTTP Import (port 9000)
`

### Current Blocker

**Tally Prime XML Import Compatibility**

The backend generates valid, well-formed XML and transmits it byte-for-byte through the transport layer with zero middleware mutation (verified by SHA-256 hash comparison across all pipeline stages).

However, real Tally Prime returns an error referencing `TDL Part:ActType Body` when the XML is submitted via HTTP POST to localhost:9000.

The mock server accepts the identical payload successfully, confirming the issue is specific to Tally Prime XML import contract expectations, not the transport layer.

### Current Investigation

Phase 115 - Comparing TallyMe-generated XML (transport-final.xml) with XML natively exported from Tally Prime to identify structural differences responsible for the import rejection.

Forensic evidence collected:
- SHA-256 of transport-final.xml: DC90157FF42D178637EAF7A76D518214FE8EA88888305CAB7AFD997EF0AD4C2F
- XML size: 3935 bytes, UTF-8, no BOM
- Transport: TallyTransportService sends payload verbatim via Node.js fetch() as text/xml

### Contributing - Help Wanted

If you have access to a live Tally Prime installation:

1. Enable XML API (Gateway of Tally -> F12 -> Advanced Configuration -> Enable XML server on port 9000)
2. Create any Purchase Voucher manually in Tally Prime
3. Export it as XML (Display -> Day Book -> select voucher -> Alt+H Export -> Format: XML)
4. Open a GitHub Issue and attach the exported XML

This direct structural comparison will unblock the Tally Prime integration.
