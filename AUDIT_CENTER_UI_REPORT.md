# Audit Center UI Report

## Interface Mapping
Route: `/audit`

Consumes: `GET /audit/events`

## Display Architecture
- **Global Timeline**: Maps the unified chronological output of the backend `AuditAggregatorService`.
- **Filters**: Exposes toggle options for `Actor`, `Target Module`, and `Creation Status` dynamically.
- **Evidence Based**: Proves exactly when an object was extracted vs when it was Vouchered vs when it hit Tally Prime.
