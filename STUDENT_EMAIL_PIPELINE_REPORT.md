# Student Email Pipeline Report

## Overview
Phase 2 mandates integrating a Gmail Watch API to stream raw emails directly to the Intelligence Layer for extraction. 

## Architectural Design
The architecture requires:
1. **Gmail API OAuth**: A school admin connects a master inbox.
2. **Pub/Sub Push Notifications**: Gmail pushes an event to an exposed webhook on new emails.
3. **Email Document Ingestion**: The system pulls the MIME payload, saves it as an `EmailDocument` row, and fires the `PaymentExtraction` pipeline.

## Runtime Status
**GMAIL_RUNTIME_STATUS = UNVERIFIED**

### Blockers
The Gmail integration requires actual Google Cloud Platform (GCP) OAuth tokens, registered redirect URIs, and an active Pub/Sub topic. Because the automated verification environment does not have access to these live credentials, this layer cannot be successfully verified. 
Per the mandatory constitution rules: "Do not fake successful Gmail API responses", no mocked interceptor was built to fake the Google SDK.

### E2E Bypassing
To prove the remainder of the Intelligence Layer (Phase 3 through 6), the E2E verification script `e2e-student-intelligence.ts` will strictly bypass the network transport and directly seed an `EmailDocument` simulating a successfully ingested payload, mimicking the hand-off from the Mail Listener.
