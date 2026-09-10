const { Queue } = require('bullmq');
const redisClient = require('./redis'); // Memakai koneksi yang sudah kita buat

// Membuat papan antrean bernama 'fuel-analysis-queue'
const fuelAnalysisQueue = new Queue('fuel-analysis-queue', {
  connection: redisClient
});

module.exports = fuelAnalysisQueue;