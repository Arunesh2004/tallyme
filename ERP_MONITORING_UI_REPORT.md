# ERP Monitoring UI Report

## Interface Mapping
Route: `/erp-monitoring`

Consumes: `GET /erp/status` & `GET /erp/history`

## Display Architecture
- **Queue Visualizer**: Represents the active BullMQ polling intervals against the Target Tally Prime Host.
- **Payload Viewer**: Renders the generated XML `ENVELOPE` string for diagnostic debugging.
- **Hard Restriction**: The UI is explicitly Read-Only. The frontend possesses zero ability to compile, intercept, or directly transmit XML to Tally Prime.
