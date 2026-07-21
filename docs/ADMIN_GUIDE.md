# TallyMe Enterprise - Administrator Guide

## 1. Onboarding & First-Time Setup
When you deploy TallyMe Enterprise for the first time, you will be redirected to the **Onboarding Wizard**. This 8-step wizard ensures the system is correctly configured for your specific educational institution.
1. **School Information**: Enter School Name, GST, PAN, and upload the logo.
2. **Email Integration**: Connect the Vendor Invoice and Student Payment mailboxes via Google Workspace or Microsoft 365 OAuth.
3. **Azure OCR**: Input your Azure Document Intelligence Endpoint and API Key.
4. **Ledger Mapping**: Map generic fee categories to your specific Tally ledger names.
5. **Tally Prime**: Input the Host, Port, and Company Name. Click **Test Connection**.

## 2. Settings Center
The Settings Center (`/settings`) allows you to view, edit, and validate all configurations made during onboarding.
- **Email Tab**: Monitor the sync status of webhooks and reconnect OAuth tokens if they expire.
- **Security Tab**: Configure JWT expiration and Session Timeouts.
- **Backups Tab**: Configure the cron schedule for automated PostgreSQL dumps.

## 3. Health & Diagnostics
- **Health Center**: Navigate to `/health` to view the live status of the Database, Redis Queue, Azure OCR, Mail APIs, and Tally Prime.
- **Diagnostics Center**: If an integration fails, the Diagnostics Center translates raw errors into actionable steps. For example, if Gmail disconnects, it will display a `Critical` error recommending a reconnection via the Settings Center.

## 4. Integration Logs
For deep troubleshooting, navigate to **Integration Logs**. This module records the exact Request, Response, Latency, and Correlation ID of every external API call to Tally, Azure, or Email providers.
