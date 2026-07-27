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
