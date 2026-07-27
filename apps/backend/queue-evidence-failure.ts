import { Worker } from 'bullmq';

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 11: VERIFY REDIS FAILURE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const worker = new Worker('zero-hallucination-queue', async (job) => {
    return { success: true };
  }, { 
    connection: { host: 'localhost', port: 6380, maxRetriesPerRequest: 1 } 
  });
  
  worker.on('error', (err) => {
    console.error('RUNTIME ERROR CAUGHT:');
    console.error(err.message);
    process.exit(1);
  });
  
  // Force a wait to trigger the connection failure
  setTimeout(() => {
    console.log('Worker failed to connect in time.');
    process.exit(1);
  }, 2000);
}

main();
