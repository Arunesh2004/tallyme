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
