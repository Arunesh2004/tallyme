import { CloudSync } from './cloud-sync';
import { HealthMonitor } from './health-monitor';
import { TallyClient } from './tally-client';

const AGENT_ID = process.env.TALLY_AGENT_ID || 'local-agent-123';
const AGENT_TOKEN = process.env.TALLY_AGENT_TOKEN || 'secure-token';
const CLOUD_URL = process.env.TALLYME_CLOUD_URL || 'http://localhost:3000';
const TALLY_URL = process.env.TALLY_PRIME_URL || 'http://localhost:9000';

async function bootstrap() {
  console.log(`Starting TallyMe Agent [${AGENT_ID}]`);
  
  const tallyClient = new TallyClient(TALLY_URL);
  const cloudSync = new CloudSync(CLOUD_URL, AGENT_ID, AGENT_TOKEN, tallyClient);
  const healthMonitor = new HealthMonitor(CLOUD_URL, AGENT_ID, AGENT_TOKEN, tallyClient);

  // 1. Send initial health report and heartbeat
  await healthMonitor.startHeartbeat(10000); // Every 10 seconds

  // 2. Start Polling for Sync Operations
  cloudSync.startPolling(5000); // Every 5 seconds

  console.log('TallyMe Agent is running in the background.');
}

bootstrap().catch(console.error);
