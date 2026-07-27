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

-- CreateIndex
CREATE UNIQUE INDEX "MigrationRollbackExecution_migrationExecutionId_key" ON "MigrationRollbackExecution"("migrationExecutionId");

-- CreateIndex
CREATE UNIQUE INDEX "MigrationVerificationReport_migrationExecutionId_key" ON "MigrationVerificationReport"("migrationExecutionId");

-- AddForeignKey
ALTER TABLE "RollbackAction" ADD CONSTRAINT "RollbackAction_rollbackExecutionId_fkey" FOREIGN KEY ("rollbackExecutionId") REFERENCES "MigrationRollbackExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
