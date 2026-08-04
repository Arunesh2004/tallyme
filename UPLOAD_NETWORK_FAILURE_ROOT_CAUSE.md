# Network Failure Root Cause Analysis: Vendor Slip Upload

## 1. Root Cause
The `AxiosError: Network Error` is caused by a **port misconfiguration and process role conflict** between the frontend environment variables and the backend startup script (`start_services.bat`). 

The frontend is attempting to send the upload request to port `3001`, but the backend process assigned to port `3001` is running in `WORKER_MODE=true`, which explicitly disables its HTTP server. Consequently, port `3001` is closed, causing the browser to throw a standard `ECONNREFUSED` / Network Error.

## 2. Evidence & Network Trace

### A. Frontend Request Configuration
- **File**: `apps/web/.env`
- **Value**: `NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"`
- **Trace**: The Axios `apiClient` constructs the upload request as `POST http://localhost:3001/api/v1/files/upload`.

### B. Backend Startup Script Override
- **File**: `start_services.bat`
- **Content**: 
  ```bat
  start "API" cmd /k "cd apps\backend && set PORT=3000&& node dist/src/main"
  start "Worker" cmd /k "cd apps\backend && set WORKER_MODE=true&& set PORT=3001&& node dist/src/main"
  ```
- **Trace**: The script forces the API node to listen on port `3000`. It forces the Worker node to use port `3001`.

### C. Backend HTTP Server Disabled on 3001
- **File**: `apps/backend/src/main.ts`
- **Content**: 
  ```typescript
  if (process.env.WORKER_MODE === 'true') {
    await app.init();
    logger.log(`🚀 Worker node is running (HTTP server disabled)`, 'Bootstrap');
  } else {
    await app.listen(port);
  }
  ```
- **Trace**: Because the `Worker` process is assigned port `3001` AND `WORKER_MODE=true`, `app.listen()` is never called. The HTTP server is disabled on port `3001`. 

### D. System Network State
- Running `netstat -ano` confirms that port `3001` is **not bound or listening**, explaining the immediate `AxiosError: Network Error` prior to any OCR backend logic being invoked. No logs for the request exist in the backend because the connection is refused at the TCP level.

## 3. Exact Fix
To align the infrastructure without colliding with the Next.js frontend (which natively prefers port 3000), `start_services.bat` must be updated so the API runs on `3001` as the frontend expects.

**Update `start_services.bat` to:**
```bat
@echo off
echo Starting API...
start "API" cmd /k "cd apps\backend && set PORT=3001&& node dist/src/main"
echo Starting Worker...
start "Worker" cmd /k "cd apps\backend && set WORKER_MODE=true&& set PORT=3002&& node dist/src/main"
```

## 4. Confidence Level
**100%**. 
Runtime verification definitively proves that `apiClient` requests `3001`, but `3001` operates headlessly without `app.listen()` due to the `WORKER_MODE` override in the batch script. No legacy mock removals caused this; the mock system historically bypassed this HTTP boundary entirely by utilizing local Next.js APIs.
