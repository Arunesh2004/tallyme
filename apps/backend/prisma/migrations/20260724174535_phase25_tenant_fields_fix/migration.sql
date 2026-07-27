-- DropForeignKey
ALTER TABLE "VoucherCandidate" DROP CONSTRAINT "VoucherCandidate_companyId_fkey";

-- AlterTable
ALTER TABLE "ERPSyncJob" ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "EmailDocument" ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "MigrationExecution" ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "MigrationPlan" ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "VoucherCandidate" ALTER COLUMN "companyId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "VoucherCandidate" ADD CONSTRAINT "VoucherCandidate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
