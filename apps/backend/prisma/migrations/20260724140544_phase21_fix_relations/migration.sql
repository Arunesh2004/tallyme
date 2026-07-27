-- AddForeignKey
ALTER TABLE "MigrationRollbackExecution" ADD CONSTRAINT "MigrationRollbackExecution_migrationExecutionId_fkey" FOREIGN KEY ("migrationExecutionId") REFERENCES "MigrationExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
