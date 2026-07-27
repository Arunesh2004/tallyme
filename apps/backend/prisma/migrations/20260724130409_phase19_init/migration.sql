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

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "roleId" TEXT NOT NULL,
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
    "vendorCode" TEXT,
    "name" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherCandidate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "voucherType" "VoucherType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "narration" TEXT,
    "partyLedgerName" TEXT,
    "isEdit" BOOLEAN NOT NULL DEFAULT false,
    "status" "VoucherStatus" NOT NULL DEFAULT 'PENDING',

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
    "batchId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "approvedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
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
CREATE UNIQUE INDEX "ERPSyncJob_voucherCandidateId_key" ON "ERPSyncJob"("voucherCandidateId");

-- CreateIndex
CREATE UNIQUE INDEX "ERPSyncJob_idempotencyHash_key" ON "ERPSyncJob"("idempotencyHash");

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
CREATE UNIQUE INDEX "_PermissionToRole_AB_unique" ON "_PermissionToRole"("A", "B");

-- CreateIndex
CREATE INDEX "_PermissionToRole_B_index" ON "_PermissionToRole"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "VoucherCandidate" ADD CONSTRAINT "VoucherCandidate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
