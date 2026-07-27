import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { execSync } from 'child_process';

const REDIS_HOST = 'localhost';
const REDIS_PORT = 6380;
const QUEUE_NAME = 'zero-hallucination-queue';
const PREFIX = 'bull'; // Default BullMQ prefix

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: VERIFY REDIS CONNECTIVITY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Host: ${REDIS_HOST}\nPort: ${REDIS_PORT}\nConnection method: ioredis via TCP`);
  
  const connection = new Redis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null });
  
  const pingResponse = await connection.ping();
  console.log(`\nPING Output:\n${pingResponse}`);
  
  const infoResponse = await connection.info();
  const infoLines = infoResponse.split('\r\n');
  const getInfo = (key: string) => infoLines.find(l => l.startsWith(key + ':'))?.split(':')[1] || 'NOT FOUND';
  
  console.log('\nINFO Extract:');
  console.log(`redis_version: ${getInfo('redis_version')}`);
  console.log(`role: ${getInfo('role')}`);
  console.log(`connected_clients: ${getInfo('connected_clients')}`);
  console.log(`used_memory_human: ${getInfo('used_memory_human')}`);
  console.log(`uptime_in_seconds: ${getInfo('uptime_in_seconds')}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 3: VERIFY BULLMQ CONFIGURATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Host: ${REDIS_HOST}`);
  console.log(`Port: ${REDIS_PORT}`);
  console.log(`Queue Prefix: ${PREFIX}`);
  console.log(`Queue Name: ${QUEUE_NAME}`);
  console.log(`Worker Name: ${QUEUE_NAME}-worker-1`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 4: VERIFY QUEUE REGISTRATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const queue = new Queue(QUEUE_NAME, { connection, prefix: PREFIX });
  await queue.drain(); // clear previous
  console.log(`Queue Name: ${queue.name}`);
  console.log(`Queue Options: ${JSON.stringify(queue.opts, null, 2)}`);
  console.log('Queue created successfully.');

  const queueEvents = new QueueEvents(QUEUE_NAME, { connection, prefix: PREFIX });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 5: VERIFY JOB CREATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const normalJob = await queue.add('normal-job', { data: 'test1' });
  const storedJob = await queue.getJob(normalJob.id!);
  console.log(`Job ID: ${storedJob!.id}`);
  console.log(`Job Name: ${storedJob!.name}`);
  console.log(`Payload: ${JSON.stringify(storedJob!.data)}`);
  console.log(`Timestamp: ${storedJob!.timestamp}`);
  console.log(`Queue State: ${await storedJob!.getState()}`);
  console.log('\nRaw Redis Output via getJob:');
  console.log(JSON.stringify(storedJob, null, 2));

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 6: VERIFY WORKER EXECUTION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Worker started');
  let workerCompletedJobs = 0;
  
  let worker = new Worker(QUEUE_NAME, async (job) => {
    console.log(`Received Job ${job.id}`);
    console.log(`Processing ${job.name}`);
    if (job.name === 'forced-failure-job') {
      if (job.attemptsMade < 2) {
        throw new Error('Intentional Failure Triggered');
      }
      console.log(`Completed forced-failure-job on attempt ${job.attemptsMade + 1}`);
      return { success: true, recovered: true };
    }
    
    if (job.name === 'delayed-job') {
      console.log(`Delayed Job Executing at ${Date.now()}`);
    }

    console.log(`Completed ${job.name}`);
    return { success: true, processedJobName: job.name };
  }, { connection, prefix: PREFIX, concurrency: 1, name: `${QUEUE_NAME}-worker-1` });

  await delay(1000); // Give worker time to process normalJob
  const normalJobFinal = await queue.getJob(normalJob.id!);
  console.log(`\nJob ID: ${normalJobFinal!.id}`);
  console.log(`Attempts: ${normalJobFinal!.attemptsMade}`);
  console.log(`Return value: ${JSON.stringify(normalJobFinal!.returnvalue)}`);
  console.log(`Completion state: ${await normalJobFinal!.getState()}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 7: VERIFY FAILED JOBS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const retryJob = await queue.add('forced-failure-job', { payload: 'retry-test' }, { attempts: 3, backoff: { type: 'fixed', delay: 1000 } });
  console.log(`Added forced-failure-job with ID ${retryJob.id}`);
  
  await delay(1000); 
  const stateAttempt1 = await queue.getJob(retryJob.id!);
  console.log(`Attempt 1 State: ${await stateAttempt1!.getState()} | Attempts Made: ${stateAttempt1!.attemptsMade} | Failed Reason: ${stateAttempt1!.failedReason}`);
  
  await delay(1500);
  const stateAttempt2 = await queue.getJob(retryJob.id!);
  console.log(`Attempt 2 State: ${await stateAttempt2!.getState()} | Attempts Made: ${stateAttempt2!.attemptsMade} | Failed Reason: ${stateAttempt2!.failedReason}`);
  
  await delay(1500);
  const stateAttempt3 = await queue.getJob(retryJob.id!);
  console.log(`Attempt 3 State: ${await stateAttempt3!.getState()} | Attempts Made: ${stateAttempt3!.attemptsMade} | Return Value: ${JSON.stringify(stateAttempt3!.returnvalue)}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 8: VERIFY DELAYED JOBS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const delayMs = 2000;
  const startDelayTime = Date.now();
  console.log(`Inserted delayed job at ${startDelayTime}`);
  const delayedJob = await queue.add('delayed-job', { data: 'test-delay' }, { delay: delayMs });
  console.log(`State instantly after insert: ${await delayedJob.getState()}`);
  
  await delay(1000); // Wait 1 second (job should still be delayed)
  console.log(`State at 1000ms: ${await delayedJob.getState()}`);
  
  await delay(1500); // Wait until it passes the 2000ms threshold
  console.log(`State at 2500ms (after delay expiry): ${await delayedJob.getState()}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 9: VERIFY IDEMPOTENCY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const countsBefore = await queue.getJobCounts();
  console.log(`Counts BEFORE: ${JSON.stringify(countsBefore)}`);
  
  const jobId = 'idempotent-unique-hash-12345';
  console.log(`Inserting Job 1 with ID: ${jobId}`);
  await queue.add('idempotent-job', { data: 'dupe-test' }, { jobId });
  console.log(`Job 1 accepted`);
  
  console.log(`Inserting Job 2 with ID: ${jobId}`);
  const dupe = await queue.add('idempotent-job', { data: 'dupe-test' }, { jobId });
  console.log(`Job 2 deduplicated (Returned Job matches ID): ${dupe.id === jobId}`);
  
  await delay(500);
  
  const countsAfter = await queue.getJobCounts();
  console.log(`Counts AFTER: ${JSON.stringify(countsAfter)}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 10: VERIFY QUEUE METRICS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const finalCounts = await queue.getJobCounts();
  console.log(`Raw Queue Metrics:`);
  console.log(JSON.stringify(finalCounts, null, 2));

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 12: VERIFY WORKER RECOVERY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Stopping worker...');
  await worker.close();
  
  console.log('Inserting recovery-job...');
  const recJob = await queue.add('recovery-job', { data: 'recover-me' });
  console.log(`Job State without worker: ${await recJob.getState()}`);
  
  console.log('Starting new worker...');
  const newWorker = new Worker(QUEUE_NAME, async (job) => {
    console.log(`New worker processed ${job.name}`);
    return { recovered: true };
  }, { connection, prefix: PREFIX });
  
  await delay(1000);
  console.log(`Job State after recovery: ${await recJob.getState()}`);
  
  const recCounts = await queue.getJobCounts();
  console.log(`Waiting jobs: ${recCounts.waiting}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 13: VERIFY PERSISTENCE (SETUP)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const persistJob = await queue.add('persistence-job', { critical: true });
  console.log(`Persistence job inserted with ID: ${persistJob.id}`);
  
  await newWorker.close();
  await queueEvents.close();
  await connection.quit();
  console.log('Connections closed. Next script handles verify after restart.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
