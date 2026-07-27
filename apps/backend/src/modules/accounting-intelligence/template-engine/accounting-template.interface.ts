export interface IAccountingTemplate {
  id: string;
  name: string;
  industry: string;
  version: string;
  structureDefinition: Record<string, any>;
  ruleDefinitions: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: Date;
}
