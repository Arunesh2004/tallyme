export interface MigrationHistoryRecord {
  id: string
  migrationId: string
  operation: string
  objectType: string
  objectName: string
  parentObject: string | null
  xmlRequest: string | null
  xmlResponse: string | null
  createdAt: string
  performedBy: string | null
  rollbackSupported: boolean
  status: string
  originalStructure: unknown | null
  recommendedStructure: unknown | null
  rollbackMetadata: unknown | null
  executionSnapshot: unknown | null
  affectedEntities: unknown | null
  accountingTemplate: string | null
  companyId: string | null
  userId: string | null
}
