# Operations Dashboard UI Report

## Interface Mapping
Route: `/dashboard`

Consumes: `GET /dashboard/overview`

## Displayed Analytics
- Total Vendor Invoices Processed
- Total Student Payments Processed
- Successful Voucher Syncs
- Active Sync Queue Sizes
- Pending Manual Reviews

All metrics dynamically fall back to an explicit `UNVERIFIED` state widget if the backend API returns a `502/503` or Network Error, ensuring operators are never viewing cached/stale pipeline assumptions.
