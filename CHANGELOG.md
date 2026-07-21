# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-21

### Added
- **Vendor Slip Automation**: End-to-end OCR and AI extraction pipeline for vendor invoices, integrated with manual review boundaries.
- **Student Fee Automation**: Automated ingestion of bank and payment gateway emails, with deterministic student matching and fee allocation strategies.
- **Shared Accounting Engine**: Immutable Double-Entry Ledger system guaranteeing transaction integrity, supporting multi-currency and zero-sum validation.
- **ERP Synchronization Engine**: Asynchronous, idempotent outbox pattern for syncing validated vouchers directly into Tally Prime via XML interface.
- **Real Tally Prime Integration**: Live, configurable TCP/HTTP bridge dynamically resolving financial years and multi-company setups.
- **Operations Portal & Admin Experience**: Next.js-powered dashboards for queue monitoring, audit tracking, manual reviews, and system health metrics.
- **Production DevOps Infrastructure**: Complete multi-stage Dockerization, CI/CD GitHub Actions pipelines, Prometheus/Grafana observability hooks, and robust security policies (Helmet, CSP, Rate Limiting).

### Security
- Implemented robust RBAC authorization across all controllers.
- Integrated TruffleHog secret scanning and Trivy dependency scanning.
- Locked down HTTP headers and strict CORS origin policies.

### Changed
- Shifted initial Monolithic designs into strict Domain-Driven Design (DDD) bounded contexts.
