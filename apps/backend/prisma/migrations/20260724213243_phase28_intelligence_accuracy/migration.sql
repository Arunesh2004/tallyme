-- AlterTable
ALTER TABLE "ApprovalBatch" ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "approvedItems" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejectedItems" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalItems" INTEGER NOT NULL DEFAULT 0;

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

-- AddForeignKey
ALTER TABLE "ApprovalBatchItem" ADD CONSTRAINT "ApprovalBatchItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ApprovalBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
