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

-- AddForeignKey
ALTER TABLE "TallyValidationCheck" ADD CONSTRAINT "TallyValidationCheck_validationRunId_fkey" FOREIGN KEY ("validationRunId") REFERENCES "TallyValidationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
