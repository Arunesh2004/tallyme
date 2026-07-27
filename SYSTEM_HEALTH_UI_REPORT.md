# System Health UI Report

## Interface Mapping
Route: `/system-health`

Consumes: `GET /system/health` & `GET /system/capabilities`

## Display Architecture
- **Component Grid**: Maps visually to each primary node: Database, Redis, BullMQ, Tally Prime, Azure OCR, Gemini AI, Gmail Watch.
- **Ping Status**: Distinct visual indicators resolving strictly to `VERIFIED`, `UNVERIFIED`, or `FAILED`.
- **Fallbacks**: If the backend is entirely offline, the frontend catches the 502 Bad Gateway and explicitly renders the entire grid as `UNVERIFIED`.
