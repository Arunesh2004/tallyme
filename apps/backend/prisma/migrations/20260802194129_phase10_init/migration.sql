-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('OPEN', 'LOCKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'ASSIGNED', 'REVIEWING', 'APPROVED', 'REJECTED', 'ESCALATED');

-- CreateTable
CREATE TABLE "AccountingPeriod" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'OPEN',
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodLockHistory" (
    "id" TEXT NOT NULL,
    "accountingPeriodId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeriodLockHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentReviewQueue" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "extractedData" JSONB NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT,
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentReviewQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountingPeriod_companyId_status_idx" ON "AccountingPeriod"("companyId", "status");

-- CreateIndex
CREATE INDEX "AccountingPeriod_companyId_startDate_endDate_idx" ON "AccountingPeriod"("companyId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPeriod_companyId_startDate_endDate_key" ON "AccountingPeriod"("companyId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "PeriodLockHistory_accountingPeriodId_idx" ON "PeriodLockHistory"("accountingPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentReviewQueue_documentId_key" ON "DocumentReviewQueue"("documentId");

-- CreateIndex
CREATE INDEX "DocumentReviewQueue_status_idx" ON "DocumentReviewQueue"("status");

-- CreateIndex
CREATE INDEX "DocumentReviewQueue_assignedTo_idx" ON "DocumentReviewQueue"("assignedTo");

-- AddForeignKey
ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodLockHistory" ADD CONSTRAINT "PeriodLockHistory_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "AccountingPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReviewQueue" ADD CONSTRAINT "DocumentReviewQueue_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
