// workers/punchoutWorker.js
const { Worker } = require('bullmq');
const connection = require('../config/redis');
const { auto_punchout_job } = require('../utils/commonUtilFunctions');


const worker = new Worker(
  'auto-punchout',
  async (job) => {
    const data = job.data;

    await auto_punchout_job(data)
   
  },
  { connection, concurrency: 3 }
);

worker.on('completed', (job) => {
  console.log(`✅ Punchout completed — job ${job.id}, attendance ${job.data.AttendanceTransID}`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Punchout failed — job ${job?.id}, attendance ${job?.data?.AttendanceTransID}:`, err.message);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing punchout worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await worker.close();
  process.exit(0);
});

module.exports = worker;