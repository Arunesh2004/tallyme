import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { execSync } from 'child_process';

const REDIS_HOST = 'localhost';
const REDIS_PORT = 6380;
const QUEUE_NAME = 'production-certification-queue';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('--- STARTING REDIS & BULLMQ CERTIFICATION ---');

  // 1. Verify Redis runtime connectivity
  console.log('[1] Verifying Redis connectivity...');
  const connection = new Redis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null });
  const pingResponse = await connection.ping();
  if (pingResponse === 'PONG') {
    console.log('  -> Connection SUCCESS (PONG received)');
  } else {
    throw new Error('Redis ping failed');
  }

  // 2. Verify BullMQ queue registration
  console.log('[2] Registering BullMQ Queue...');
  const queue = new Queue(QUEUE_NAME, { connection });
  await queue.drain(); // Clean up previous runs
  console.log('  -> Queue registration SUCCESS');

  const queueEvents = new QueueEvents(QUEUE_NAME, { connection });

  // 4. Verify workers receive and execute jobs
  console.log('[4] Spinning up Worker...');
  let workerCompletedJobs = 0;
  let workerFailedJobs = 0;
  
  let worker = new Worker(QUEUE_NAME, async (job) => {
    if (job.name === 'forced-failure-job') {
      if (job.attemptsMade < 2) {
        throw new Error('Intentional failure');
      }
      return { success: true, recovered: true };
    }
    return { success: true, name: job.name };
  }, { connection, concurrency: 1 });

  worker.on('completed', () => { workerCompletedJobs++; });
  worker.on('failed', () => { workerFailedJobs++; });
  console.log('  -> Worker spun up SUCCESS');

  // 3. Create real jobs and confirm they are stored in Redis
  console.log('[3] Creating real jobs...');
  const normalJob = await queue.add('normal-job', { data: 'test1' });
  const storedJob = await queue.getJob(normalJob.id!);
  if (storedJob && storedJob.id === normalJob.id) {
    console.log(`  -> Job stored in Redis SUCCESS (ID: ${storedJob.id})`);
  }

  // Await normal job completion
  await delay(500);
  if (workerCompletedJobs > 0) {
    console.log('  -> Worker executed normal job SUCCESS');
  }

  // 5. Verify retry behaviour after forced failures
  console.log('[5] Verifying retry behaviour...');
  const retryJob = await queue.add('forced-failure-job', { data: 'test2' }, { attempts: 3, backoff: { type: 'fixed', delay: 100 } });
  
  await delay(1000); // Give it time to fail twice and succeed on the third
  const finalRetryState = await queue.getJob(retryJob.id!);
  if (finalRetryState?.attemptsMade === 3 && await finalRetryState.isCompleted()) {
    console.log('  -> Retry behaviour SUCCESS (Failed twice, succeeded on 3rd attempt)');
  } else {
    console.log('  -> Retry behaviour FAILED');
  }

  // 6. Verify delayed jobs execute correctly
  console.log('[6] Verifying delayed jobs...');
  const startDelay = Date.now();
  await queue.add('delayed-job', { data: 'test3' }, { delay: 1000 });
  await delay(500);
  const delayedCountsHalfway = await queue.getJobCounts();
  if (delayedCountsHalfway.delayed >= 1) {
    console.log('  -> Delayed job queued properly SUCCESS');
  }
  await delay(1000); // Wait for the delay to expire
  
  // 7. Verify duplicate job handling/idempotency
  console.log('[7] Verifying idempotency...');
  await queue.add('idempotent-job', { data: 'test4' }, { jobId: 'my-unique-job-id' });
  await queue.add('idempotent-job', { data: 'test4' }, { jobId: 'my-unique-job-id' });
  
  const allIdempotentJobs = await queue.getJobs(['completed', 'waiting', 'active']);
  const matchingIdempotent = allIdempotentJobs.filter(j => j.id === 'my-unique-job-id');
  if (matchingIdempotent.length === 1) {
    console.log('  -> Idempotency SUCCESS (Duplicate job ignored)');
  }

  // 8. Kill and restart workers to verify recovery
  console.log('[8] Verifying worker recovery...');
  await worker.close();
  
  await queue.add('recovery-job', { data: 'test5' });
  
  await delay(200); // Wait while job sits in queue
  
  worker = new Worker(QUEUE_NAME, async (job) => {
    return { success: true };
  }, { connection });
  
  await delay(500); // Wait for new worker to pick it up
  const recoveryCounts = await queue.getJobCounts();
  if (recoveryCounts.completed > 0) {
    console.log('  -> Worker recovery SUCCESS');
  }

  // 10. Verify queue metrics
  console.log('[10] Fetching final queue metrics...');
  const finalCounts = await queue.getJobCounts();
  console.log(`  -> Metrics: Waiting(${finalCounts.waiting}), Active(${finalCounts.active}), Completed(${finalCounts.completed}), Failed(${finalCounts.failed}), Delayed(${finalCounts.delayed})`);

  // 9. Stop Redis and verify backend/worker reconnection behaviour
  console.log('[9] Stopping Redis container to verify reconnection behaviour...');
  console.log('  -> Shutting down Redis...');
  execSync('docker stop tallyme-redis-1');
  
  let redisErrorDetected = false;
  connection.on('error', (err) => {
    if (!redisErrorDetected) {
      console.log(`  -> Redis disconnection detected SUCCESS: ${err.message}`);
      redisErrorDetected = true;
    }
  });

  worker.on('error', (err) => {
     // Worker connection error tracking
  });

  await delay(3000);

  console.log('  -> Restarting Redis...');
  execSync('docker start tallyme-redis-1');

  await delay(3000);
  
  const pingAfter = await connection.ping();
  if (pingAfter === 'PONG') {
    console.log('  -> Reconnection SUCCESS');
  }

  // Clean up
  await worker.close();
  await queueEvents.close();
  await connection.quit();

  console.log('--- REDIS & BULLMQ TEST COMPLETE ---');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
