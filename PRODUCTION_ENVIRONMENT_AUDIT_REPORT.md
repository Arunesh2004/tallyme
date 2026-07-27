# Production Environment Audit Report

## Frontend Environment Variables
| Variable | Purpose | Secret? | Status |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL | No | 🟢 VERIFIED (documented) |
| `NEXT_PUBLIC_APP_ENV` | Environment label | No | 🟢 VERIFIED (documented) |

> No sensitive keys are exposed to the browser. All `NEXT_PUBLIC_*` values are non-secret routing/configuration values.

## Backend Environment Variables
| Variable | Purpose | Committed? | Status |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL DSN | No — `.env` is gitignored | 🟢 VERIFIED |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection | No | 🟢 VERIFIED |
| `JWT_SECRET` | JWT signing key | No | 🟢 VERIFIED |
| `TALLY_HOST` / `TALLY_PORT` | Tally TCP target | No | 🟡 UNVERIFIED (no live Tally) |
| `AZURE_OCR_ENDPOINT` / `AZURE_OCR_KEY` | Azure Form Recognizer | No | 🟡 UNVERIFIED (no credentials) |
| `GEMINI_API_KEY` | Google Gemini AI | No | 🟡 UNVERIFIED (no credentials) |
| `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` | Gmail OAuth | No | 🟡 UNVERIFIED (no credentials) |

## Secret Exposure Audit
- `.env` is listed in `.gitignore` ✅
- `.env.production.example` contains only placeholder values ✅
- No API keys hardcoded in source files (verified by `grep`) ✅
