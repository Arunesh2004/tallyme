-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('DRAFT', 'PENDING_VERIFICATION', 'ACTIVE', 'INACTIVE', 'BLOCKED', 'MERGED');

-- CreateEnum
CREATE TYPE "AliasStatus" AS ENUM ('PENDING', 'APPROVED', 'STALE', 'REVOKED');

-- CreateEnum
CREATE TYPE "MatchDecisionStatus" AS ENUM ('ACTIVE', 'REVERSED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'OCR_PROCESSING', 'OCR_FAILED', 'EXTRACTION_PROCESSING', 'EXTRACTION_FAILED', 'VENDOR_MATCHING', 'VENDOR_UNMATCHED', 'EXPENSE_ALLOCATING', 'MANUAL_REVIEW', 'VOUCHER_GENERATED', 'ERP_SYNCING', 'COMPLETED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING_EXTRACTION', 'EXTRACTED', 'MANUAL_REVIEW_REQUIRED', 'APPROVED', 'QUEUED', 'SYNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('Receipt', 'Payment', 'Journal', 'Purchase', 'Sales', 'Contra');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ERPSyncStatus" AS ENUM ('PENDING', 'SYNCING', 'SYNCED', 'FAILED_TEMPORARY', 'FAILED_PERMANENT', 'UNKNOWN', 'VERIFYING', 'MANUAL_REVIEW', 'CANCELLED', 'RETRY_PENDING');

-- CreateEnum
CREATE TYPE "EmailDocumentStatus" AS ENUM ('RECEIVED', 'PARSED', 'EXTRACTION_PROCESSING', 'EXTRACTION_FAILED', 'STUDENT_MATCHING', 'STUDENT_UNMATCHED', 'FEE_ALLOCATING', 'MANUAL_REVIEW', 'VOUCHER_GENERATED', 'ERP_SYNCING', 'COMPLETED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "EmailProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'QUEUED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('INGESTED', 'EXTRACTED', 'ENRICHED', 'DRAFT', 'PENDING_APPROVAL', 'REJECTED', 'APPROVED', 'QUEUED', 'SYNCED', 'POSTED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'LOCKED', 'UNLOCKED', 'DELETED');

-- CreateEnum
CREATE TYPE "DuplicateClassification" AS ENUM ('EXACT_DUPLICATE', 'LIKELY_DUPLICATE', 'POSSIBLE_DUPLICATE', 'NOT_DUPLICATE');

-- CreateEnum
CREATE TYPE "DuplicateRecommendedAction" AS ENUM ('AUTO_BLOCK', 'REQUIRE_ADMIN', 'REQUIRE_CHECKER', 'ALLOW_WITH_WARNING', 'ALLOW');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "roleId" TEXT NOT NULL,
    "organizationId" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "companyId" TEXT,
    "enrollmentNo" TEXT NOT NULL,
    "admissionNumber" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "status" TEXT,
    "admissionStatus" TEXT,
    "enrollmentDate" TIMESTAMP(3),
    "guardianId" TEXT,
    "class" TEXT,
    "section" TEXT,
    "academicYear" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "companyId" TEXT,
    "vendorCode" TEXT,
    "name" TEXT,
    "legalName" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBranch" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "survivingBranchId" TEXT,
    "gstin" TEXT,
    "branchName" TEXT NOT NULL,
    "address" JSONB,
    "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VendorBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorLedger" (
    "id" TEXT NOT NULL,
    "vendorBranchId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "erpLedgerCode" TEXT NOT NULL,
    "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "defaultExpenseCategory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorAlias" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorLedgerId" TEXT NOT NULL,
    "aliasText" TEXT NOT NULL,
    "normalizationType" TEXT NOT NULL DEFAULT 'EXACT',
    "isSystemGenerated" BOOLEAN NOT NULL DEFAULT false,
    "successfulUses" INTEGER NOT NULL DEFAULT 0,
    "reversals" INTEGER NOT NULL DEFAULT 0,
    "maturityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" "AliasStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokedAt" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "VendorAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorMatchDecision" (
    "id" TEXT NOT NULL,
    "invoiceCandidateId" TEXT NOT NULL,
    "selectedVendorLedgerId" TEXT NOT NULL,
    "isAutomated" BOOLEAN NOT NULL DEFAULT false,
    "marginDelta" DOUBLE PRECISION,
    "matchEvidence" JSONB NOT NULL,
    "resolvedByUserId" TEXT,
    "status" "MatchDecisionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorMatchDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorAudit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorBranchId" TEXT,
    "changeType" TEXT NOT NULL,
    "oldPayload" JSONB,
    "newPayload" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "companyId" TEXT,
    "fileUrl" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "confidenceScore" DOUBLE PRECISION,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceCandidate" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "date" TIMESTAMP(3),
    "subtotal" DECIMAL(15,2),
    "tax" DECIMAL(15,2),
    "total" DECIMAL(15,2),
    "extractedGstin" TEXT,
    "extractedPan" TEXT,
    "extractedName" TEXT,
    "extractedData" JSONB,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING_EXTRACTION',

    CONSTRAINT "InvoiceCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorMatch" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseAllocation" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "totalAllocated" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "ExpenseAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseAllocationLine" (
    "id" TEXT NOT NULL,
    "expenseAllocationId" TEXT NOT NULL,
    "ledgerName" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "ExpenseAllocationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualReviewRoute" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ManualReviewRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorSlipAudit" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorSlipAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherCandidate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "voucherNumber" TEXT NOT NULL,
    "voucherType" "VoucherType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "narration" TEXT,
    "partyLedgerName" TEXT,
    "isEdit" BOOLEAN NOT NULL DEFAULT false,
    "status" "VoucherStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,

    CONSTRAINT "VoucherCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherCandidateEntry" (
    "id" TEXT NOT NULL,
    "voucherCandidateId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "ledgerName" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "isDebit" BOOLEAN NOT NULL,
    "isParty" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VoucherCandidateEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ERPSyncJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "companyId" TEXT,
    "voucherCandidateId" TEXT NOT NULL,
    "status" "ERPSyncStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "verificationAttempts" INTEGER NOT NULL DEFAULT 0,
    "idempotencyHash" TEXT NOT NULL,
    "nextRetryAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "lastVerificationAt" TIMESTAMP(3),
    "lastError" TEXT,
    "erpReferenceId" TEXT,
    "adapterCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestXml" TEXT,
    "responseXml" TEXT,
    "lastResponse" TEXT,
    "responseTimeMs" INTEGER,
    "xmlHash" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "voucherNumber" TEXT,
    "masterId" TEXT,
    "guid" TEXT,
    "transportStatus" TEXT,
    "parserWarnings" TEXT[],

    CONSTRAINT "ERPSyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ERPSyncHistory" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "statusFrom" "ERPSyncStatus",
    "statusTo" "ERPSyncStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ERPSyncHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationHistory" (
    "id" TEXT NOT NULL,
    "migrationId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectName" TEXT NOT NULL,
    "parentObject" TEXT,
    "xmlRequest" TEXT,
    "xmlResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performedBy" TEXT,
    "rollbackSupported" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "originalStructure" JSONB,
    "recommendedStructure" JSONB,
    "rollbackMetadata" JSONB,
    "executionSnapshot" JSONB,
    "affectedEntities" JSONB,
    "accountingTemplate" TEXT,
    "companyId" TEXT,
    "userId" TEXT,

    CONSTRAINT "MigrationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ERPSyncAttempt" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "payloadSize" INTEGER,
    "responseType" TEXT,
    "parserWarnings" TEXT[],
    "requestTime" TIMESTAMP(3) NOT NULL,
    "responseTime" TIMESTAMP(3),
    "durationMs" INTEGER,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ERPSyncAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "companyId" TEXT,
    "messageId" TEXT NOT NULL,
    "subject" TEXT,
    "sender" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" "EmailDocumentStatus" NOT NULL DEFAULT 'RECEIVED',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastProcessedStep" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentPaymentCandidate" (
    "id" TEXT NOT NULL,
    "documentId" TEXT,
    "paymentGateway" TEXT,
    "gatewayTransactionId" TEXT,
    "utr" TEXT,
    "bankReference" TEXT,
    "payerEmail" TEXT,
    "payerPhone" TEXT,
    "rawStudentName" TEXT,
    "amount" DECIMAL(15,2),
    "paymentDate" TIMESTAMP(3),
    "extractionConfidence" DOUBLE PRECISION,
    "extractedData" JSONB,
    "paymentCandidateId" TEXT,
    "studentId" TEXT,
    "admissionNumber" TEXT,
    "matchedBy" TEXT,
    "confidence" DOUBLE PRECISION,
    "matchingStrategy" TEXT,
    "matchingScore" DOUBLE PRECISION,
    "warnings" JSONB,
    "manualReviewRequired" BOOLEAN,
    "rawMatchingData" JSONB,
    "status" TEXT,

    CONSTRAINT "StudentPaymentCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentMatchResult" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "matchingStrategy" TEXT NOT NULL,
    "candidateList" JSONB,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentMatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFeeAllocation" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "totalAllocated" DECIMAL(15,2) NOT NULL,
    "allocationType" TEXT NOT NULL,

    CONSTRAINT "StudentFeeAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFeeAllocationLine" (
    "id" TEXT NOT NULL,
    "studentFeeAllocationId" TEXT NOT NULL,
    "outstandingFeeId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "StudentFeeAllocationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentManualReviewRoute" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "StudentManualReviewRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentPaymentAudit" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentPaymentAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolConfiguration" (
    "id" TEXT NOT NULL,
    "schoolName" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "gst" TEXT,
    "pan" TEXT,
    "financialYear" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "logoUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailIntegrationConfiguration" (
    "id" TEXT NOT NULL,
    "vendorMailbox" TEXT,
    "studentMailbox" TEXT,
    "provider" TEXT,
    "clientId" TEXT,
    "clientSecretEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "syncIntervalMinutes" INTEGER NOT NULL DEFAULT 5,
    "lastSyncAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailIntegrationConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OCRIntegrationConfiguration" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'AZURE_DOCUMENT_INTELLIGENCE',
    "endpoint" TEXT,
    "apiKeyEncrypted" TEXT,
    "modelId" TEXT DEFAULT 'prebuilt-invoice',
    "confidenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OCRIntegrationConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ERPIntegrationConfiguration" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'TALLY_PRIME',
    "host" TEXT,
    "port" INTEGER,
    "companyName" TEXT,
    "timeoutMs" INTEGER NOT NULL DEFAULT 30000,
    "retryCount" INTEGER NOT NULL DEFAULT 3,
    "encoding" TEXT NOT NULL DEFAULT 'utf-16le',
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ERPIntegrationConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerMappingConfiguration" (
    "id" TEXT NOT NULL,
    "vendorLedger" TEXT,
    "studentLedger" TEXT,
    "gstLedger" TEXT,
    "bankLedger" TEXT,
    "cashLedger" TEXT,
    "discountLedger" TEXT,
    "feeCategories" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerMappingConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationConfiguration" (
    "id" TEXT NOT NULL,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPassEncrypted" TEXT,
    "alertEmails" TEXT[],
    "enableSystemAlerts" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityConfiguration" (
    "id" TEXT NOT NULL,
    "jwtExpirationHours" INTEGER NOT NULL DEFAULT 24,
    "sessionTimeoutMins" INTEGER NOT NULL DEFAULT 60,
    "passwordPolicyRegex" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupConfiguration" (
    "id" TEXT NOT NULL,
    "scheduleCron" TEXT,
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "destinationType" TEXT,
    "destinationUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackupConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationLog" (
    "id" TEXT NOT NULL,
    "correlationId" TEXT,
    "provider" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "requestPayload" TEXT,
    "responsePayload" TEXT,
    "latencyMs" INTEGER,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentCandidate" (
    "id" TEXT NOT NULL,
    "gateway" TEXT,
    "transactionId" TEXT,
    "utr" TEXT,
    "referenceNumber" TEXT,
    "rawData" JSONB,

    CONSTRAINT "PaymentCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParsingAttempt" (
    "id" TEXT NOT NULL,
    "emailId" TEXT,
    "parserUsed" TEXT,
    "success" BOOLEAN,
    "confidenceScore" DOUBLE PRECISION,
    "paymentCandidateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParsingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchingAttempt" (
    "id" TEXT NOT NULL,
    "strategyUsed" TEXT,
    "executionTimeMs" INTEGER,
    "resultStatus" TEXT,
    "studentPaymentCandidateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualReviewTask" (
    "id" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "status" TEXT,
    "assignedTo" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualReviewTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherValidationLog" (
    "id" TEXT NOT NULL,
    "voucherValidationId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoucherValidationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentMatch" (
    "id" TEXT NOT NULL,
    "studentPaymentCandidateId" TEXT,

    CONSTRAINT "StudentMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchingConflict" (
    "id" TEXT NOT NULL,
    "studentPaymentCandidateId" TEXT,

    CONSTRAINT "MatchingConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherGenerationAttempt" (
    "id" TEXT NOT NULL,

    CONSTRAINT "VoucherGenerationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorLedgerProfile" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT,
    "defaultLedgerCode" TEXT,

    CONSTRAINT "VendorLedgerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherLedger" (
    "id" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "VoucherLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseAllocationCandidate" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorMatchResultId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3),
    "subtotal" DECIMAL(15,2),
    "totalTax" DECIMAL(15,2),
    "discount" DECIMAL(15,2),
    "roundOff" DECIMAL(15,2),
    "totalAmount" DECIMAL(15,2),
    "currency" TEXT,
    "status" TEXT,
    "voucherCandidateId" TEXT,

    CONSTRAINT "ExpenseAllocationCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseAllocationLine2" (
    "id" TEXT NOT NULL,
    "expenseAllocationCandidateId" TEXT NOT NULL,
    "ledgerName" TEXT,
    "amount" DECIMAL(15,2),

    CONSTRAINT "ExpenseAllocationLine2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxBreakdownLine" (
    "id" TEXT NOT NULL,
    "expenseAllocationCandidateId" TEXT NOT NULL,
    "taxType" TEXT,
    "amount" DECIMAL(15,2),

    CONSTRAINT "TaxBreakdownLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherValidation" (
    "id" TEXT NOT NULL,
    "voucherCandidateId" TEXT,
    "status" TEXT,
    "executionTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoucherValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomingEmail" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "status" "EmailProcessingStatus" NOT NULL DEFAULT 'RECEIVED',

    CONSTRAINT "IncomingEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailProcessingLog" (
    "id" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "status" "EmailProcessingStatus" NOT NULL,
    "message" TEXT,
    "errorDetails" JSONB,

    CONSTRAINT "EmailProcessingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAttachment" (
    "id" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "filename" TEXT,
    "mimeType" TEXT,
    "fileUrl" TEXT,

    CONSTRAINT "EmailAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeAllocationCandidate" (
    "id" TEXT NOT NULL,
    "studentPaymentCandidateId" TEXT,
    "validationStatus" TEXT,
    "voucherCandidateId" TEXT,

    CONSTRAINT "FeeAllocationCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeValidation" (
    "id" TEXT NOT NULL,
    "feeAllocationCandidateId" TEXT,
    "status" TEXT,
    "executionTimeMs" INTEGER,

    CONSTRAINT "FeeValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeValidationLog" (
    "id" TEXT NOT NULL,
    "feeValidationId" TEXT,
    "details" JSONB,

    CONSTRAINT "FeeValidationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeValidationException" (
    "id" TEXT NOT NULL,
    "feeAllocationCandidateId" TEXT,

    CONSTRAINT "FeeValidationException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutstandingFee" (
    "id" TEXT NOT NULL,
    "studentId" TEXT,
    "amountPaid" DECIMAL(15,2),
    "isPaid" BOOLEAN,

    CONSTRAINT "OutstandingFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchSyncJob" (
    "id" TEXT NOT NULL,
    "idempotencyHash" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'VENDOR_SLIP',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "queuedItems" INTEGER NOT NULL DEFAULT 0,
    "processingItems" INTEGER NOT NULL DEFAULT 0,
    "syncedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BatchSyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchSyncItem" (
    "id" TEXT NOT NULL,
    "batchJobId" TEXT NOT NULL,
    "invoiceCandidateId" TEXT NOT NULL,
    "voucherCandidateId" TEXT,
    "queueJobId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BatchSyncItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyDiscoveryReport" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "snapshotVersion" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "recommendations" JSONB,

    CONSTRAINT "TallyDiscoveryReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryGroup" (
    "id" TEXT NOT NULL,
    "tallyDiscoveryReportId" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "DiscoveryGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryLedger" (
    "id" TEXT NOT NULL,
    "tallyDiscoveryReportId" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "DiscoveryLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryVoucherType" (
    "id" TEXT NOT NULL,
    "tallyDiscoveryReportId" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "DiscoveryVoucherType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryCostCentre" (
    "id" TEXT NOT NULL,
    "tallyDiscoveryReportId" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "DiscoveryCostCentre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "version" TEXT NOT NULL,
    "structureDefinition" JSONB,
    "ruleDefinitions" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingDecisionLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inputData" JSONB,
    "resolverOutput" JSONB,
    "appliedRules" JSONB,
    "ledgerDecision" JSONB,
    "confidence" DOUBLE PRECISION,
    "supportingEvidence" JSONB,
    "userOverride" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AccountingDecisionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalBatch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "companyId" TEXT,
    "batchId" TEXT NOT NULL,
    "createdBy" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "approvedCount" INTEGER NOT NULL DEFAULT 0,
    "approvedItems" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedItems" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,

    CONSTRAINT "ApprovalBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "type" TEXT NOT NULL,
    "entityId" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StructureAnalysisReport" (
    "id" TEXT NOT NULL,
    "discoveryId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "issues" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StructureAnalysisReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "companyId" TEXT,
    "discoveryId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MigrationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationAction" (
    "id" TEXT NOT NULL,
    "migrationPlanId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "rollbackSupported" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MigrationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationExecution" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "companyId" TEXT,
    "migrationPlanId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MigrationExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationExecutionAction" (
    "id" TEXT NOT NULL,
    "migrationExecutionId" TEXT NOT NULL,
    "migrationActionId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "externalEntityType" TEXT,
    "externalEntityName" TEXT,
    "executionAttempt" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestHash" TEXT,
    "responseHash" TEXT,
    "errorMessage" TEXT,
    "beforeState" JSONB,
    "afterState" JSONB,
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "MigrationExecutionAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationRollbackExecution" (
    "id" TEXT NOT NULL,
    "migrationExecutionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "rollbackSnapshot" JSONB,

    CONSTRAINT "MigrationRollbackExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationDependencyGraph" (
    "id" TEXT NOT NULL,
    "migrationPlanId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "dependsOn" TEXT NOT NULL,
    "dependencyType" TEXT NOT NULL,

    CONSTRAINT "MigrationDependencyGraph_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RollbackAction" (
    "id" TEXT NOT NULL,
    "rollbackExecutionId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "beforeState" JSONB,
    "afterState" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,

    CONSTRAINT "RollbackAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationVerificationReport" (
    "id" TEXT NOT NULL,
    "migrationExecutionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MigrationVerificationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityId" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNREAD',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionCorrectionLog" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT,
    "correctedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractionCorrectionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyOperationVerification" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "requestXML" TEXT,
    "responseXML" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TallyOperationVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEW_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'VIEW_ONLY',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEW_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "companyId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "correlationId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIModelVersion" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIModelVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIExecutionLog" (
    "id" TEXT NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "outputHash" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "latency" INTEGER NOT NULL,
    "humanCorrected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAccuracyMetric" (
    "id" TEXT NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "totalPredictions" INTEGER NOT NULL DEFAULT 0,
    "correctPredictions" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAccuracyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMFA" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMFA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "APIKey" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "permissions" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "APIKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionPolicy" (
    "id" TEXT NOT NULL,
    "documentDays" INTEGER NOT NULL DEFAULT 365,
    "auditLogDays" INTEGER NOT NULL DEFAULT 730,
    "autoCleanup" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryTestLog" (
    "id" TEXT NOT NULL,
    "backupId" TEXT,
    "status" TEXT NOT NULL,
    "report" JSONB,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecoveryTestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyValidationRun" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "organizationId" TEXT,
    "validationType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalChecks" INTEGER NOT NULL DEFAULT 0,
    "passedChecks" INTEGER NOT NULL DEFAULT 0,
    "failedChecks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TallyValidationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyValidationCheck" (
    "id" TEXT NOT NULL,
    "validationRunId" TEXT NOT NULL,
    "checkType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expectedValue" TEXT,
    "actualValue" TEXT,
    "difference" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TallyValidationCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingReconciliation" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT,
    "tallyVoucherNumber" TEXT,
    "expectedAmount" DECIMAL(65,30),
    "actualAmount" DECIMAL(65,30),
    "difference" DECIMAL(65,30),
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationSnapshot" (
    "id" TEXT NOT NULL,
    "migrationId" TEXT,
    "beforeStructure" JSONB,
    "afterStructure" JSONB,
    "changedLedgers" JSONB,
    "changedGroups" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MigrationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyMasterMapping" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "tallyName" TEXT NOT NULL,
    "tallyGuid" TEXT,
    "internalEntityId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TallyMasterMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfidencePolicy" (
    "id" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "minimumConfidence" DOUBLE PRECISION NOT NULL,
    "criticality" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfidencePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalPolicy" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "transactionType" TEXT NOT NULL,
    "minimumAmount" DECIMAL(65,30),
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "requiredRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionFieldConfidence" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "extractedValue" TEXT,
    "normalizedValue" TEXT,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "sourceText" TEXT,
    "validationStatus" TEXT NOT NULL,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "reviewReason" TEXT,
    "modelVersion" TEXT,
    "promptVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractionFieldConfidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionCorrection" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "correctedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractionCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectionPattern" (
    "id" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "wrongValue" TEXT NOT NULL,
    "correctValue" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "confidenceImprovement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorrectionPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingException" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "exceptionType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "assignedTo" TEXT,
    "resolvedBy" TEXT,
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterResolutionHistory" (
    "id" TEXT NOT NULL,
    "mappingId" TEXT NOT NULL,
    "beforeState" TEXT,
    "afterState" TEXT,
    "matchingMethod" TEXT,
    "confidence" DOUBLE PRECISION,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterResolutionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalBatchItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reviewComment" TEXT,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalBatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyStructureScan" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "scanStatus" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalLedgers" INTEGER NOT NULL DEFAULT 0,
    "totalGroups" INTEGER NOT NULL DEFAULT 0,
    "totalVouchers" INTEGER NOT NULL DEFAULT 0,
    "totalCompanies" INTEGER NOT NULL DEFAULT 0,
    "issuesFound" INTEGER NOT NULL DEFAULT 0,
    "recommendationsGenerated" INTEGER NOT NULL DEFAULT 0,
    "organizationScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TallyStructureScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyLedgerSnapshot" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "ledgerName" TEXT NOT NULL,
    "guid" TEXT,
    "parentGroup" TEXT,
    "openingBalance" DECIMAL(65,30),
    "closingBalance" DECIMAL(65,30),
    "gstRegistration" TEXT,
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "taxType" TEXT,
    "currency" TEXT,
    "billWiseTracking" BOOLEAN NOT NULL DEFAULT false,
    "creditPeriod" TEXT,
    "contactDetails" JSONB,
    "rawData" JSONB,
    "rawXML" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TallyLedgerSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyGroupSnapshot" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "parentGroup" TEXT,
    "nature" TEXT,
    "childLedgers" JSONB,
    "rawData" JSONB,
    "rawXML" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TallyGroupSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyOrganizationRecommendation" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "currentStructure" JSONB NOT NULL,
    "recommendedStructure" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isDuplicateCandidate" BOOLEAN NOT NULL DEFAULT false,
    "mergeCandidates" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TallyOrganizationRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyMigrationPlan" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "createdBy" TEXT,
    "migrationType" TEXT NOT NULL,
    "beforeSnapshot" JSONB,
    "plannedChanges" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TallyMigrationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyMigrationApproval" (
    "id" TEXT NOT NULL,
    "migrationPlanId" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvalStatus" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TallyMigrationApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyMigrationExecution" (
    "id" TEXT NOT NULL,
    "migrationPlanId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "beforeValue" JSONB,
    "afterValue" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TallyMigrationExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyConnectionConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "companyName" TEXT,
    "connectionName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TallyConnectionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "companyId" TEXT,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "lastConnectedAt" TIMESTAMP(3),
    "lastHealthCheck" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TallyConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyCompanyDiscovery" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyGuid" TEXT,
    "financialYear" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "rawXML" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TallyCompanyDiscovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyEnvironmentReport" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "companyName" TEXT,
    "financialYear" TEXT,
    "totalLedgers" INTEGER NOT NULL DEFAULT 0,
    "totalGroups" INTEGER NOT NULL DEFAULT 0,
    "totalVouchers" INTEGER NOT NULL DEFAULT 0,
    "health" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TallyEnvironmentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallySyncSession" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TallySyncSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallySyncLog" (
    "id" TEXT NOT NULL,
    "syncSessionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "requestXML" TEXT,
    "responseXML" TEXT,
    "status" TEXT NOT NULL,
    "latency" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TallySyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyHealthMetric" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "latency" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TallyHealthMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingAgent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentExecution" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "organizationId" TEXT,
    "companyId" TEXT,
    "triggerType" TEXT NOT NULL,
    "inputContext" JSONB,
    "decision" JSONB,
    "confidence" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingRecommendation" (
    "id" TEXT NOT NULL,
    "exceptionId" TEXT,
    "recommendationType" TEXT NOT NULL,
    "beforeState" JSONB,
    "afterState" JSONB,
    "reason" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentDecisionEvidence" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "evidenceData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentDecisionEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentFeedback" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "rejected" BOOLEAN NOT NULL,
    "humanComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRule" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "condition" JSONB NOT NULL,
    "action" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingAction" (
    "id" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "description" TEXT,
    "requiredApprovalRole" TEXT NOT NULL,
    "rollbackPolicy" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionRequest" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT,
    "approvedBy" TEXT,
    "executionType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ExecutionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionStep" (
    "id" TEXT NOT NULL,
    "executionRequestId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "requestPayload" JSONB,
    "tallyRequestXML" TEXT,
    "tallyResponseXML" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionRollback" (
    "id" TEXT NOT NULL,
    "executionRequestId" TEXT NOT NULL,
    "rollbackData" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionRollback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIModelPerformance" (
    "id" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "timePeriod" TEXT NOT NULL,
    "previousValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "trend" TEXT NOT NULL,
    "totalRecommendations" INTEGER NOT NULL DEFAULT 0,
    "approvedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "executionSuccessCount" INTEGER NOT NULL DEFAULT 0,
    "rollbackCount" INTEGER NOT NULL DEFAULT 0,
    "accuracyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIModelPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentLearningMetric" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "patternType" TEXT NOT NULL,
    "beforeConfidence" DOUBLE PRECISION NOT NULL,
    "afterConfidence" DOUBLE PRECISION NOT NULL,
    "improvement" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentLearningMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingOperationMetric" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "metricType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "period" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingOperationMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDecisionPattern" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decisionType" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "rejected" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDecisionPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelligenceOptimization" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "currentState" JSONB NOT NULL,
    "recommendedState" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntelligenceOptimization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingKnowledgeDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "approvedBy" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTill" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingKnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingKnowledgeRule" (
    "id" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "ruleVersion" INTEGER NOT NULL DEFAULT 1,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingKnowledgeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeUsageLog" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "knowledgeId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationExplanation" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "explanationType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "reasoningSteps" JSONB NOT NULL,
    "confidenceFactors" JSONB NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeFeedback" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "knowledgeId" TEXT NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "comment" TEXT,
    "impactScore" DOUBLE PRECISION NOT NULL,
    "reviewedBy" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyAgentInstallation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "machineName" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "agentVersion" TEXT NOT NULL,
    "agentToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TallyAgentInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentHeartbeat" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "tallyStatus" TEXT NOT NULL,
    "tallyCompany" TEXT,
    "tallyVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentSyncQueue" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT,
    "actionType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentSyncQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncOperationEvent" (
    "id" TEXT NOT NULL,
    "syncId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncOperationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorInvoiceRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorInvoiceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentPaymentRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentPaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncVerification" (
    "id" TEXT NOT NULL,
    "syncId" TEXT NOT NULL,
    "expectedResult" JSONB NOT NULL,
    "actualResult" JSONB,
    "status" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissions" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "device" TEXT,
    "ip" TEXT,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "limits" JSONB NOT NULL,
    "features" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageMetric" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "featureName" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemEventLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemAlert" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "alertType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SystemAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncDeadLetter" (
    "id" TEXT NOT NULL,
    "syncId" TEXT NOT NULL,
    "failureReason" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "aiAnalysis" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncDeadLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentDeviceApproval" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "deviceFingerprint" TEXT NOT NULL,
    "deviceName" TEXT,
    "ipAddress" TEXT,
    "status" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentDeviceApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupRecord" (
    "id" TEXT NOT NULL,
    "backupType" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackupRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionDraft" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'INGESTED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "auditVersion" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TransactionDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionAuditLog" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "requestId" TEXT,
    "idempotencyKey" TEXT,
    "sourceModule" TEXT NOT NULL,
    "previousVersion" INTEGER NOT NULL,
    "newVersion" INTEGER NOT NULL,
    "delta" JSONB NOT NULL,

    CONSTRAINT "TransactionAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceFingerprint" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vendorId" TEXT,
    "algorithmVersion" TEXT NOT NULL,
    "normalizationVersion" TEXT NOT NULL,
    "providerVersion" TEXT,
    "normalizedInvoiceNumber" TEXT,
    "normalizedVendorName" TEXT,
    "normalizedAmount" TEXT,
    "normalizedDate" TEXT,
    "documentHash" TEXT NOT NULL,
    "classification" "DuplicateClassification",
    "score" DOUBLE PRECISION,
    "recommendedAction" "DuplicateRecommendedAction",
    "decisionMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceFingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuplicateDetectionPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "companyId" TEXT,
    "exactThreshold" DOUBLE PRECISION NOT NULL DEFAULT 95.0,
    "likelyThreshold" DOUBLE PRECISION NOT NULL DEFAULT 80.0,
    "possibleThreshold" DOUBLE PRECISION NOT NULL DEFAULT 60.0,
    "weights" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DuplicateDetectionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionOutbox" (
    "id" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "TransactionOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PermissionToRole" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_action_key" ON "Permission"("action");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "Student_enrollmentNo_key" ON "Student"("enrollmentNo");

-- CreateIndex
CREATE UNIQUE INDEX "Student_admissionNumber_key" ON "Student"("admissionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_vendorCode_key" ON "Vendor"("vendorCode");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_gstin_key" ON "Vendor"("gstin");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_pan_key" ON "Vendor"("pan");

-- CreateIndex
CREATE INDEX "VendorBranch_companyId_idx" ON "VendorBranch"("companyId");

-- CreateIndex
CREATE INDEX "VendorBranch_vendorId_idx" ON "VendorBranch"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBranch_companyId_gstin_key" ON "VendorBranch"("companyId", "gstin");

-- CreateIndex
CREATE INDEX "VendorLedger_companyId_idx" ON "VendorLedger"("companyId");

-- CreateIndex
CREATE INDEX "VendorLedger_vendorBranchId_idx" ON "VendorLedger"("vendorBranchId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorLedger_companyId_erpLedgerCode_key" ON "VendorLedger"("companyId", "erpLedgerCode");

-- CreateIndex
CREATE INDEX "VendorAlias_companyId_idx" ON "VendorAlias"("companyId");

-- CreateIndex
CREATE INDEX "VendorAlias_vendorLedgerId_idx" ON "VendorAlias"("vendorLedgerId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorAlias_companyId_aliasText_key" ON "VendorAlias"("companyId", "aliasText");

-- CreateIndex
CREATE UNIQUE INDEX "VendorMatchDecision_invoiceCandidateId_key" ON "VendorMatchDecision"("invoiceCandidateId");

-- CreateIndex
CREATE INDEX "VendorMatchDecision_selectedVendorLedgerId_idx" ON "VendorMatchDecision"("selectedVendorLedgerId");

-- CreateIndex
CREATE INDEX "VendorAudit_companyId_idx" ON "VendorAudit"("companyId");

-- CreateIndex
CREATE INDEX "VendorAudit_vendorId_idx" ON "VendorAudit"("vendorId");

-- CreateIndex
CREATE INDEX "VendorAudit_vendorBranchId_idx" ON "VendorAudit"("vendorBranchId");

-- CreateIndex
CREATE INDEX "Document_companyId_idx" ON "Document"("companyId");

-- CreateIndex
CREATE INDEX "Document_receivedAt_idx" ON "Document"("receivedAt");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceCandidate_documentId_key" ON "InvoiceCandidate"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorMatch_documentId_key" ON "VendorMatch"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseAllocation_documentId_key" ON "ExpenseAllocation"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "ManualReviewRoute_documentId_key" ON "ManualReviewRoute"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "VoucherCandidate_voucherNumber_key" ON "VoucherCandidate"("voucherNumber");

-- CreateIndex
CREATE INDEX "VoucherCandidate_companyId_idx" ON "VoucherCandidate"("companyId");

-- CreateIndex
CREATE INDEX "VoucherCandidate_status_idx" ON "VoucherCandidate"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ERPSyncJob_voucherCandidateId_key" ON "ERPSyncJob"("voucherCandidateId");

-- CreateIndex
CREATE UNIQUE INDEX "ERPSyncJob_idempotencyHash_key" ON "ERPSyncJob"("idempotencyHash");

-- CreateIndex
CREATE INDEX "ERPSyncJob_companyId_idx" ON "ERPSyncJob"("companyId");

-- CreateIndex
CREATE INDEX "ERPSyncJob_status_idx" ON "ERPSyncJob"("status");

-- CreateIndex
CREATE INDEX "ERPSyncJob_status_updatedAt_idx" ON "ERPSyncJob"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailDocument_messageId_key" ON "EmailDocument"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentPaymentCandidate_documentId_key" ON "StudentPaymentCandidate"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentPaymentCandidate_paymentCandidateId_key" ON "StudentPaymentCandidate"("paymentCandidateId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentMatchResult_documentId_key" ON "StudentMatchResult"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentFeeAllocation_documentId_key" ON "StudentFeeAllocation"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentManualReviewRoute_documentId_key" ON "StudentManualReviewRoute"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorLedgerProfile_vendorId_key" ON "VendorLedgerProfile"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "VoucherLedger_name_key" ON "VoucherLedger"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseAllocationCandidate_voucherCandidateId_key" ON "ExpenseAllocationCandidate"("voucherCandidateId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseAllocationCandidate_vendorId_invoiceNumber_key" ON "ExpenseAllocationCandidate"("vendorId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "IncomingEmail_messageId_key" ON "IncomingEmail"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeAllocationCandidate_voucherCandidateId_key" ON "FeeAllocationCandidate"("voucherCandidateId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchSyncJob_idempotencyHash_key" ON "BatchSyncJob"("idempotencyHash");

-- CreateIndex
CREATE UNIQUE INDEX "BatchSyncItem_invoiceCandidateId_key" ON "BatchSyncItem"("invoiceCandidateId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalBatch_batchId_key" ON "ApprovalBatch"("batchId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_companyId_idx" ON "ApprovalRequest"("companyId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MigrationExecution_migrationPlanId_key" ON "MigrationExecution"("migrationPlanId");

-- CreateIndex
CREATE INDEX "MigrationExecution_companyId_idx" ON "MigrationExecution"("companyId");

-- CreateIndex
CREATE INDEX "MigrationExecution_status_idx" ON "MigrationExecution"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MigrationRollbackExecution_migrationExecutionId_key" ON "MigrationRollbackExecution"("migrationExecutionId");

-- CreateIndex
CREATE UNIQUE INDEX "MigrationVerificationReport_migrationExecutionId_key" ON "MigrationVerificationReport"("migrationExecutionId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMembership_userId_companyId_key" ON "CompanyMembership"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "RoleAssignment_userId_organizationId_key" ON "RoleAssignment"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_correlationId_timestamp_idx" ON "AuditLog"("entityId", "correlationId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "UserMFA_userId_key" ON "UserMFA"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "APIKey_keyHash_key" ON "APIKey"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingAgent_agentType_key" ON "AccountingAgent"("agentType");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingAction_actionType_key" ON "AccountingAction"("actionType");

-- CreateIndex
CREATE UNIQUE INDEX "TallyAgentInstallation_machineId_key" ON "TallyAgentInstallation"("machineId");

-- CreateIndex
CREATE UNIQUE INDEX "TallyAgentInstallation_agentToken_key" ON "TallyAgentInstallation"("agentToken");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_email_key" ON "UserAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_refreshToken_key" ON "UserSession"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSubscription_organizationId_key" ON "OrganizationSubscription"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_transactionId_key" ON "PaymentTransaction"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentDeviceApproval_deviceFingerprint_key" ON "AgentDeviceApproval"("deviceFingerprint");

-- CreateIndex
CREATE INDEX "TransactionDraft_tenantId_idx" ON "TransactionDraft"("tenantId");

-- CreateIndex
CREATE INDEX "TransactionDraft_status_idx" ON "TransactionDraft"("status");

-- CreateIndex
CREATE INDEX "TransactionDraft_companyId_idx" ON "TransactionDraft"("companyId");

-- CreateIndex
CREATE INDEX "TransactionDraft_tenantId_companyId_idx" ON "TransactionDraft"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "TransactionDraft_tenantId_status_idx" ON "TransactionDraft"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionAuditLog_idempotencyKey_key" ON "TransactionAuditLog"("idempotencyKey");

-- CreateIndex
CREATE INDEX "TransactionAuditLog_transactionId_idx" ON "TransactionAuditLog"("transactionId");

-- CreateIndex
CREATE INDEX "TransactionAuditLog_timestamp_idx" ON "TransactionAuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "InvoiceFingerprint_tenantId_vendorId_idx" ON "InvoiceFingerprint"("tenantId", "vendorId");

-- CreateIndex
CREATE INDEX "InvoiceFingerprint_tenantId_normalizedVendorName_idx" ON "InvoiceFingerprint"("tenantId", "normalizedVendorName");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceFingerprint_tenantId_documentHash_key" ON "InvoiceFingerprint"("tenantId", "documentHash");

-- CreateIndex
CREATE INDEX "DuplicateDetectionPolicy_tenantId_idx" ON "DuplicateDetectionPolicy"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "DuplicateDetectionPolicy_tenantId_companyId_key" ON "DuplicateDetectionPolicy"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "TransactionOutbox_status_idx" ON "TransactionOutbox"("status");

-- CreateIndex
CREATE INDEX "TransactionOutbox_status_nextRetryAt_createdAt_idx" ON "TransactionOutbox"("status", "nextRetryAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "_PermissionToRole_AB_unique" ON "_PermissionToRole"("A", "B");

-- CreateIndex
CREATE INDEX "_PermissionToRole_B_index" ON "_PermissionToRole"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBranch" ADD CONSTRAINT "VendorBranch_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBranch" ADD CONSTRAINT "VendorBranch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorLedger" ADD CONSTRAINT "VendorLedger_vendorBranchId_fkey" FOREIGN KEY ("vendorBranchId") REFERENCES "VendorBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorLedger" ADD CONSTRAINT "VendorLedger_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAlias" ADD CONSTRAINT "VendorAlias_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAlias" ADD CONSTRAINT "VendorAlias_vendorLedgerId_fkey" FOREIGN KEY ("vendorLedgerId") REFERENCES "VendorLedger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMatchDecision" ADD CONSTRAINT "VendorMatchDecision_invoiceCandidateId_fkey" FOREIGN KEY ("invoiceCandidateId") REFERENCES "InvoiceCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMatchDecision" ADD CONSTRAINT "VendorMatchDecision_selectedVendorLedgerId_fkey" FOREIGN KEY ("selectedVendorLedgerId") REFERENCES "VendorLedger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAudit" ADD CONSTRAINT "VendorAudit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAudit" ADD CONSTRAINT "VendorAudit_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAudit" ADD CONSTRAINT "VendorAudit_vendorBranchId_fkey" FOREIGN KEY ("vendorBranchId") REFERENCES "VendorBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceCandidate" ADD CONSTRAINT "InvoiceCandidate_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMatch" ADD CONSTRAINT "VendorMatch_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMatch" ADD CONSTRAINT "VendorMatch_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAllocation" ADD CONSTRAINT "ExpenseAllocation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAllocationLine" ADD CONSTRAINT "ExpenseAllocationLine_expenseAllocationId_fkey" FOREIGN KEY ("expenseAllocationId") REFERENCES "ExpenseAllocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualReviewRoute" ADD CONSTRAINT "ManualReviewRoute_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorSlipAudit" ADD CONSTRAINT "VendorSlipAudit_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherCandidate" ADD CONSTRAINT "VoucherCandidate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherCandidateEntry" ADD CONSTRAINT "VoucherCandidateEntry_voucherCandidateId_fkey" FOREIGN KEY ("voucherCandidateId") REFERENCES "VoucherCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ERPSyncJob" ADD CONSTRAINT "ERPSyncJob_voucherCandidateId_fkey" FOREIGN KEY ("voucherCandidateId") REFERENCES "VoucherCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ERPSyncHistory" ADD CONSTRAINT "ERPSyncHistory_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ERPSyncJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ERPSyncAttempt" ADD CONSTRAINT "ERPSyncAttempt_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ERPSyncJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPaymentCandidate" ADD CONSTRAINT "StudentPaymentCandidate_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "EmailDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPaymentCandidate" ADD CONSTRAINT "StudentPaymentCandidate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMatchResult" ADD CONSTRAINT "StudentMatchResult_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "EmailDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMatchResult" ADD CONSTRAINT "StudentMatchResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeAllocation" ADD CONSTRAINT "StudentFeeAllocation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "EmailDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeAllocationLine" ADD CONSTRAINT "StudentFeeAllocationLine_studentFeeAllocationId_fkey" FOREIGN KEY ("studentFeeAllocationId") REFERENCES "StudentFeeAllocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentManualReviewRoute" ADD CONSTRAINT "StudentManualReviewRoute_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "EmailDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPaymentAudit" ADD CONSTRAINT "StudentPaymentAudit_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "EmailDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAllocationCandidate" ADD CONSTRAINT "ExpenseAllocationCandidate_voucherCandidateId_fkey" FOREIGN KEY ("voucherCandidateId") REFERENCES "VoucherCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAllocationLine2" ADD CONSTRAINT "ExpenseAllocationLine2_expenseAllocationCandidateId_fkey" FOREIGN KEY ("expenseAllocationCandidateId") REFERENCES "ExpenseAllocationCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxBreakdownLine" ADD CONSTRAINT "TaxBreakdownLine_expenseAllocationCandidateId_fkey" FOREIGN KEY ("expenseAllocationCandidateId") REFERENCES "ExpenseAllocationCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeAllocationCandidate" ADD CONSTRAINT "FeeAllocationCandidate_studentPaymentCandidateId_fkey" FOREIGN KEY ("studentPaymentCandidateId") REFERENCES "StudentPaymentCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeAllocationCandidate" ADD CONSTRAINT "FeeAllocationCandidate_voucherCandidateId_fkey" FOREIGN KEY ("voucherCandidateId") REFERENCES "VoucherCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchSyncItem" ADD CONSTRAINT "BatchSyncItem_batchJobId_fkey" FOREIGN KEY ("batchJobId") REFERENCES "BatchSyncJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryGroup" ADD CONSTRAINT "DiscoveryGroup_tallyDiscoveryReportId_fkey" FOREIGN KEY ("tallyDiscoveryReportId") REFERENCES "TallyDiscoveryReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryLedger" ADD CONSTRAINT "DiscoveryLedger_tallyDiscoveryReportId_fkey" FOREIGN KEY ("tallyDiscoveryReportId") REFERENCES "TallyDiscoveryReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryVoucherType" ADD CONSTRAINT "DiscoveryVoucherType_tallyDiscoveryReportId_fkey" FOREIGN KEY ("tallyDiscoveryReportId") REFERENCES "TallyDiscoveryReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryCostCentre" ADD CONSTRAINT "DiscoveryCostCentre_tallyDiscoveryReportId_fkey" FOREIGN KEY ("tallyDiscoveryReportId") REFERENCES "TallyDiscoveryReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StructureAnalysisReport" ADD CONSTRAINT "StructureAnalysisReport_discoveryId_fkey" FOREIGN KEY ("discoveryId") REFERENCES "TallyDiscoveryReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationPlan" ADD CONSTRAINT "MigrationPlan_discoveryId_fkey" FOREIGN KEY ("discoveryId") REFERENCES "TallyDiscoveryReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationPlan" ADD CONSTRAINT "MigrationPlan_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AccountingTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationAction" ADD CONSTRAINT "MigrationAction_migrationPlanId_fkey" FOREIGN KEY ("migrationPlanId") REFERENCES "MigrationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationExecution" ADD CONSTRAINT "MigrationExecution_migrationPlanId_fkey" FOREIGN KEY ("migrationPlanId") REFERENCES "MigrationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationExecutionAction" ADD CONSTRAINT "MigrationExecutionAction_migrationExecutionId_fkey" FOREIGN KEY ("migrationExecutionId") REFERENCES "MigrationExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationExecutionAction" ADD CONSTRAINT "MigrationExecutionAction_migrationActionId_fkey" FOREIGN KEY ("migrationActionId") REFERENCES "MigrationAction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationRollbackExecution" ADD CONSTRAINT "MigrationRollbackExecution_migrationExecutionId_fkey" FOREIGN KEY ("migrationExecutionId") REFERENCES "MigrationExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollbackAction" ADD CONSTRAINT "RollbackAction_rollbackExecutionId_fkey" FOREIGN KEY ("rollbackExecutionId") REFERENCES "MigrationRollbackExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIExecutionLog" ADD CONSTRAINT "AIExecutionLog_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "AIModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAccuracyMetric" ADD CONSTRAINT "AIAccuracyMetric_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "AIModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMFA" ADD CONSTRAINT "UserMFA_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APIKey" ADD CONSTRAINT "APIKey_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TallyValidationCheck" ADD CONSTRAINT "TallyValidationCheck_validationRunId_fkey" FOREIGN KEY ("validationRunId") REFERENCES "TallyValidationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalBatchItem" ADD CONSTRAINT "ApprovalBatchItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ApprovalBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AccountingAgent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentDecisionEvidence" ADD CONSTRAINT "AgentDecisionEvidence_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "AccountingRecommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentFeedback" ADD CONSTRAINT "AgentFeedback_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "AgentExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRule" ADD CONSTRAINT "AgentRule_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AccountingAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionStep" ADD CONSTRAINT "ExecutionStep_executionRequestId_fkey" FOREIGN KEY ("executionRequestId") REFERENCES "ExecutionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionRollback" ADD CONSTRAINT "ExecutionRollback_executionRequestId_fkey" FOREIGN KEY ("executionRequestId") REFERENCES "ExecutionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionAuditLog" ADD CONSTRAINT "TransactionAuditLog_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "TransactionDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

