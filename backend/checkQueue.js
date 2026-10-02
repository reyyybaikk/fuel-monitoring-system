const { Queue } = require('bullmq');
const redisClient = require('./src/config/redis');

(async () => {
  const queue = new Queue('fuel-analysis-queue', { connection: redisClient });
  const counts = await queue.getJobCounts();
  console.log('Queue counts:', counts);
  process.exit(0);
})();
