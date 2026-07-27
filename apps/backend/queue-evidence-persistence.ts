import { Queue } from 'bullmq';
import Redis from 'ioredis';

const REDIS_HOST = 'localhost';
const REDIS_PORT = 6380;
const QUEUE_NAME = 'zero-hallucination-queue';
const PREFIX = 'bull';

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 13: VERIFY PERSISTENCE (VERIFICATION)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const connection = new Redis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null });
  const queue = new Queue(QUEUE_NAME, { connection, prefix: PREFIX });
  
  console.log('Fetching delayed/waiting jobs after restart...');
  const jobs = await queue.getJobs(['waiting', 'delayed']);
  
  const persistJob = jobs.find(j => j.name === 'persistence-job');
  if (persistJob) {
    console.log(`Persistence Job Found! ID: ${persistJob.id}`);
    console.log(`Job Data: ${JSON.stringify(persistJob.data)}`);
  } else {
    console.log('Persistence Job NOT FOUND!');
  }
  
  await connection.quit();
}

main().catch(console.error);
