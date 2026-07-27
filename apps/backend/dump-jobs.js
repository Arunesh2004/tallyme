const { Queue } = require('bullmq');
const queues = ['voucher-generation', 'tally-sync'];
async function main() {
  for (const qName of queues) {
    const q = new Queue(qName, { connection: { host: 'localhost', port: 6380 } });
    const jobs = await q.getJobs(['completed', 'failed']);
    console.log('---', qName, '---');
    jobs.forEach(j => console.log('Job:', j.id, 'Failed:', j.failedReason, 'Return:', j.returnvalue));
  }
  process.exit(0);
}
main();
