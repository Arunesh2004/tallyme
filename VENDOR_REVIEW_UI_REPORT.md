# Vendor Review Queue UI Report

## Interface Mapping
Route: `/vendor-review`

Consumes: `GET /review/vendor`

## Display Architecture
- **Data Table**: Sortable via matching confidence scores.
- **Document Viewer**: Safely renders the source PDF / image binary stream.
- **Decision Controls**: Explicit "APPROVE" or "REJECT" flows for items locked in `MANUAL_REVIEW_REQUIRED` due to extraction boundary rules.
- **Strict Logic**: The React frontend explicitly contains ZERO calculation routines. It simply acts as an orchestration viewer.
