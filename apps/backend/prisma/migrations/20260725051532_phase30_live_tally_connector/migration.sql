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
