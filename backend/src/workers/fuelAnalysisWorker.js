const { Worker } = require('bullmq');
const redisClient = require('../config/redis');
const db = require('../config/db');
const axios = require('axios');
const { sendAnomalyAlert } = require('../utils/whatsapp');
console.log('========================================');
console.log('[Worker] Menjalankan Fuel Analysis Worker...');
console.log('========================================');

// Membuat Koki (Worker) yang memantau papan antrean 'fuel-analysis-queue'
const worker = new Worker('fuel-analysis-queue', async (job) => {
  console.log(`\n[Worker] 🚀 Menerima Job ID: ${job.id}`);
  console.log(`[Worker] Memproses Transaksi BBM ID: ${job.data.transactionId}`);


 // 1. Real processing – call ML service for anomaly detection
console.log('[Worker] Memanggil layanan ML untuk deteksi anomali...');
const ML_ENGINE_URL = process.env.ML_ENGINE_URL;
let anomaly = false;
try {
  const mlResp = await axios.post(`${ML_ENGINE_URL}/detect`, {
    transactionId: job.data.transactionId,
    amount: job.data.amount,
    fuelType: job.data.fuelType,
  });
  anomaly = mlResp.data.anomaly;
  console.log(`[Worker] Anomali terdeteksi: ${anomaly}`);
} catch (err) {
  console.error('[Worker] ❌ Gagal memanggil layanan ML:', err.message);
}

// 2. SUCCESS HANDLING – perbarui PostgreSQL dengan hasil
const updateQuery = `
  UPDATE fuel_transactions
  SET notes = $1,
      is_anomaly = $2,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = $3
  RETURNING *;
`;
const noteMsg = anomaly ? 'Anomali terdeteksi (ML)' : 'Tidak ada anomali (ML)';
await db.query(updateQuery, [noteMsg, anomaly, job.data.transactionId]);
console.log(`[Worker] ✅ Job ${job.id} selesai. PostgreSQL berhasil diupdate (anomaly=${anomaly}).`);
  // Kirim notifikasi WhatsApp bila anomali terdeteksi
  // Retrieve admin WhatsApp number from region_contracts (fallback to env var)
    let adminNumber = null;
    try {
      const adminRes = await db.query(
        `SELECT rc.admin_whatsapp
         FROM fuel_transactions ft
         JOIN vehicles v ON ft.vehicle_id = v.id
         JOIN region_contacts rc ON LOWER(rc.ul_nd) = LOWER(v.ul_nd) OR LOWER(rc.ul_pln) = LOWER(v.ul_nd)
         WHERE ft.id = $1
         LIMIT 1`,
        [job.data.transactionId]
      );
      if (adminRes.rowCount > 0) adminNumber = adminRes.rows[0].admin_whatsapp;
    } catch (e) {
      console.error('[Worker] Failed to fetch admin WhatsApp:', e.message);
    }
    // Send WhatsApp alert (use adminNumber if available)
    await sendAnomalyAlert(job.data.transactionId, job.data.amount, job.data.fuelType, anomaly, adminNumber);


  return { success: true, transactionId: job.data.transactionId, anomaly };






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