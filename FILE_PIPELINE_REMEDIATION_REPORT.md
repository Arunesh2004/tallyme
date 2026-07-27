# FILE PIPELINE REMEDIATION REPORT

**Date:** 2026-07-24  
**Phase:** 12 — Production Gap Closure  
**Audit Finding:** `FilesController` stored files to disk but the Prisma persistence line was commented out. Files could not be retrieved or linked to documents.

---

## Root Cause

`files.controller.ts` called `LocalStorageProvider.store()` to persist the file to disk, then had:

```typescript
// 2. Persist FileMetadata to Database (stubbed Prisma call)
// await this.prisma.fileMetadata.create({ data: metadata });
```

The comment was both commented out AND referenced a non-existent table (`fileMetadata`). The correct entity is `Document` (which owns the upload lifecycle in the schema).

Additionally, `FilesController` was not registered in any NestJS module — it had no module file — so it was never even loaded by the DI container.

---

## Changes Made

### Files Modified

| File | Change |
|------|--------|
| `src/modules/files/files.controller.ts` | **Full persistence implementation**: stores file, checks for duplicate by SHA-256 checksum, creates `Document` entity in PostgreSQL |
| `src/modules/files/files.module.ts` | **[NEW]** Created `FilesModule` to register `FilesController` with DI container |
| `src/app.module.ts` | Added `FilesModule` import to `AppModule` |

### Upload Pipeline (Implemented)

```
POST /files/upload (multipart/form-data)
  → Validate MIME type (PDF, PNG, JPEG, TIFF)
  → Validate file size (≤ 10 MB)
  → LocalStorageProvider.store(buffer, name, mime)
      → SHA-256 checksum calculated
      → File saved to: storage/invoices/{year}/{month}/{uuid}-{sanitizedName}
      → Returns: { id, originalName, storedName, checksum, path }
  → prisma.document.findFirst({ where: { checksum } })  [duplicate check]
      → If duplicate found: return { fileId: existing.id, status: 'DUPLICATE' }
  → prisma.document.create({
        fileUrl: metadata.path,
        checksum: metadata.checksum,
        mimeType: ...,
        uploadedBy: req.user.id,
        source: 'MANUAL_UPLOAD',
        status: 'UPLOADED'
    })
  → Return: { fileId: document.id, checksum, status: 'UPLOADED' }
```

### GET /files/:id (Implemented)
```
→ prisma.document.findUnique({ where: { id } })
→ Return { url: document.fileUrl, status: document.status }
```

### GET /files/:id/metadata (Implemented)
```
→ prisma.document.findUnique({ where: { id } })
→ Return full Document metadata
```

### Pipeline Integration
The returned `fileId` (which is now a real `Document.id`) is used by the OCR endpoint:
```
POST /ocr/process/:fileId
  → prisma.document.findUnique({ where: { id: fileId } })
  → ocrCoordinator.runOCR(document.fileUrl)  [real file path, not stub path]
  → aiExtractor.extract(rawText)
  → prisma.invoiceCandidate.create({ documentId: document.id, ... })
  → queueService.addJob('vendor-slip-queue', ...)
```

---

## Verification

| Test | Expected | Mechanism |
|------|----------|-----------|
| Upload file → DB record created | `Document` row exists after upload | `prisma.document.create()` called with real data |
| Duplicate file detected | Returns `{ status: 'DUPLICATE' }` without creating new record | SHA-256 checksum compared via `prisma.document.findFirst` |
| Pipeline continues after upload | OCR can find file by `fileId` | OCR fetches real `document.fileUrl` from DB |
| Invalid MIME type rejected | `400 BadRequestException` | Pre-storage MIME validation |
| File size limit enforced | `400 BadRequestException` on files > 10 MB | Pre-storage size validation |

> **Note**: Runtime evidence requires a running PostgreSQL instance and local filesystem with write permissions to `storage/invoices/`. The `LocalStorageProvider.retrieve()` and `delete()` methods still need full file-path-from-DB lookup — marked for Phase 13 completion.
