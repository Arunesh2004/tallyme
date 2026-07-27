# Tally Migration Center UI Report

## Interface Mapping
Route: `/tally-migration`

Consumes: `GET /tally/migrations`

## Display Architecture
- **Ledger Diff View**: A standard markdown diff view contrasting the locally maintained TallyMe Vendor profile against the current Tally Prime remote profile.
- **Rollback Guard**: The physical Rollback button is locked behind the explicit `ACCOUNTANT` role.
- **Alert Banner**: Enforces the warning "Rollback requires accountant verification." before emitting the PUT request back to the backend.
