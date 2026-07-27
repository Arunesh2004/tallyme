-- AlterTable
ALTER TABLE "MigrationHistory" ADD COLUMN     "affectedEntities" JSONB,
ADD COLUMN     "executionSnapshot" JSONB;

-- CreateTable
CREATE TABLE "MigrationExecution" (
    "id" TEXT NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "MigrationExecution_migrationPlanId_key" ON "MigrationExecution"("migrationPlanId");

-- AddForeignKey
ALTER TABLE "MigrationExecution" ADD CONSTRAINT "MigrationExecution_migrationPlanId_fkey" FOREIGN KEY ("migrationPlanId") REFERENCES "MigrationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationExecutionAction" ADD CONSTRAINT "MigrationExecutionAction_migrationExecutionId_fkey" FOREIGN KEY ("migrationExecutionId") REFERENCES "MigrationExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationExecutionAction" ADD CONSTRAINT "MigrationExecutionAction_migrationActionId_fkey" FOREIGN KEY ("migrationActionId") REFERENCES "MigrationAction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
