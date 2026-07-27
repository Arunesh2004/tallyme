import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { TallyOrganizationController } from './modules/erp-connector/controllers/tally-organization.controller';
import { TallyTransportService } from './modules/erp-connector/services/transport.service';

// (implementation note)
const mockTallyTransportService = {
  send: async (xml: string) => {
    // If it's a list of accounts request, return a basic list
    if (xml.includes('List of Accounts')) {
      return {
        rawResponse: `
          <ENVELOPE>
            <BODY>
              <DATA>
                <COLLECTION>
                  <NAME>Bank Account</NAME>
                  <NAME>Sundry Creditors</NAME>
                  <NAME>Fee Collection</NAME>
                </COLLECTION>
              </DATA>
            </BODY>
          </ENVELOPE>
        `,
      };
    }
    // If it's a create request, return success
    if (xml.includes('ACTION="Create"')) {
      return {
        rawResponse: `<ENVELOPE><BODY><DATA><CREATED>1</CREATED></DATA></BODY></ENVELOPE>`,
      };
    }
    return { rawResponse: '' };
  },
  checkHealth: async () => true,
};

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runE2E() {
  console.log('🚀 Starting Tally Intelligence E2E Trace...');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(TallyTransportService)
    .useValue(mockTallyTransportService)
    .compile();

  const app = moduleFixture.createNestApplication();
  await app.init();

  const controller = app.get(TallyOrganizationController);

  try {
    // 1. Preview Migration (Discovery -> Diff -> Plan)
    console.log('\n--- Phase 1: Execution Preview (Discovery & Diff) ---');
    const preview = await controller.preview();
    console.log(
      'Current Structure Fetched:',
      JSON.stringify(preview.currentStructure),
    );
    console.log(`Changes Required: ${preview.changesRequired} Objects`);
    console.log(
      'Migration Plan:',
      JSON.stringify(preview.migrationPlan, null, 2),
    );

    // 2. Execute Migration
    console.log('\n--- Phase 2: Execution (Approved) ---');
    const execution = await controller.organize({ confirm: true });
    console.log(
      `✅ Migration Executed. Migration ID: ${execution.migrationId}`,
    );
    console.log(`   Objects Created: ${execution.objectsCreated}`);
    console.log(execution.created);

    // 3. Rollback
    console.log('\n--- Phase 3: Rollback Simulation ---');
    const rollback = await controller.rollback(execution.migrationId as string);
    console.log(
      `✅ Rollback Processed. Tally Objects Touched: ${rollback.tallyObjectsTouched}`,
    );
    console.log('Recommendations provided for accountant cleanup:');
    rollback.cleanupRecommendations
      .slice(0, 3)
      .forEach((r) => console.log(` - ${r}`));
    if (rollback.cleanupRecommendations.length > 3)
      console.log('   ...and more');
  } catch (error: any) {
    console.error('❌ E2E Failed:', error);
  } finally {
    await app.close();
  }
}

runE2E();
