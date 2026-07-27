# Configuration Panel UI Report

## Interface Mapping
Route: `/configuration`

Consumes: `GET /admin/config` & `PUT /admin/config`

## Display Architecture
- **Threshold Sliders**: Allow administrators to dynamically update OCR confidence boundary expectations (e.g. `matchingThresholds`).
- **Processing Engine**: Toggle UI for active `BullMQ` concurrent queue limits and timeout rules.
- **Security Check**: The API strips underlying API keys, thus the React interface contains zero form fields to manage secrets.
