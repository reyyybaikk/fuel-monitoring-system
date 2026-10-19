const { Worker } = require('bullmq');
const redisClient = require('../config/redis');
const db = require('../config/db');
const axios = require('axios');
console.log('========================================');
console.log('[Worker] Menjalankan Fuel Analysis Worker...');
console.log('========================================');

// Membuat Koki (Worker) yang memantau papan antrean 'fuel-analysis-queue'
const worker = new Worker('fuel-analysis-queue', async (job) => {
  console.log(`\n[Worker] 🚀 Menerima Job ID: ${job.id}`);
  console.log(`[Worker] Memproses Transaksi BBM ID: ${job.data.transactionId}`);


  // 1. Delegasikan seluruh analisis (OCR, Boundary Check, Odometer Logic, Rule/ML Engine, & Notifikasi) ke ML Engine
  console.log('[Worker] Memanggil layanan ML Engine untuk analisis terpadu...');
  const ML_ENGINE_URL = process.env.ML_ENGINE_URL || 'http://localhost:8000';
  let mlResult = null;

  try {
    const payloadML = {
      transactionId: job.data.transactionId,
      amount: job.data.amount,
      fuelType: job.data.fuelType,
    };
    console.log(`[Worker] Mengirim ke ML Engine (${ML_ENGINE_URL}/detect):`, payloadML);
    const mlResp = await axios.post(`${ML_ENGINE_URL}/detect`, payloadML);
    mlResult = mlResp.data;
    console.log(`[Worker] ✅ Respons ML Engine diterima:`, mlResult);
  } catch (err) {
    console.error('[Worker] ❌ Gagal memanggil layanan ML Engine:', err.message);
    // Catat kegagalan koneksi di catatan transaksi tanpa menimpa status analitik
    await db.query(
      `UPDATE fuel_transactions SET notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [`Analisis tertunda: Layanan ML tidak merespons (${err.message})`, job.data.transactionId]
    );
    throw err; // Lempar error agar BullMQ mencatat retry / failed job
  }

  // 2. ML Engine telah menangani update database secara detail (OCR data, anomaly score, status, real consumption, rule labels)
  // serta notifikasi WhatsApp ke Admin Wilayah.
  console.log(`[Worker] ✅ Job ${job.id} selesai diproses oleh ML Engine (anomaly=${mlResult.anomaly}, score=${mlResult.score}).`);

  return { 
    success: true, 
    transactionId: job.data.transactionId, 
    anomaly: mlResult.anomaly, 
    score: mlResult.score,
    notes: mlResult.notes 
  };
}, {
  connection: redisClient,
  concurrency: 1 // Mulai dari 1 job pada satu waktu agar aman dari bentrok (Step 09.17)
});

// --- EVENT LISTENERS UNTUK MONITORING DASAR (STEP 09.18 & 09.19) ---
worker.on('completed', (job) => {
  console.log(`[Event] Job ${job.id} telah berstatus COMPLETED.`);
});

worker.on('failed', (job, err) => {
  console.log(`[Event] Job ${job.id} berstatus FAILED. Alasan: ${err.message}`);
});