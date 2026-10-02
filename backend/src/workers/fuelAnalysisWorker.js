const { Worker } = require('bullmq');
const redisClient = require('../config/redis');
const db = require('../config/db');


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
return { success: true, transactionId: job.data.transactionId, anomaly };

  // 2. SUCCESS HANDLING (Memperbarui PostgreSQL)
  try {
    const updateQuery = `
      UPDATE fuel_transactions 
      SET notes = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
      RETURNING *;
    `;
    // Kita isi notes dengan pesan sukses sementara
    await db.query(updateQuery, ['Analisis Selesai (Dummy ML)', job.data.transactionId]);
    console.log(`[Worker] ✅ Job ${job.id} selesai. PostgreSQL berhasil diupdate.`);
    
    // Nilai return ini akan disimpan oleh Redis sebagai bukti sukses
    return { success: true, transactionId: job.data.transactionId };

  } catch (error) {
    console.error(`[Worker] ❌ Gagal mengupdate PostgreSQL:`, error.message);
    // PENTING: Lempar error agar BullMQ tahu job ini GAGAL, sehingga mekanisme RETRY bisa aktif
    throw error; 
  }

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