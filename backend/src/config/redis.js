const Redis = require('ioredis');
require('dotenv').config();

// Membuat satu instance Redis yang akan di-reuse oleh seluruh aplikasi
const redisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || null,
  // Mekanisme retry (coba lagi) jika koneksi ke Redis terputus
  retryStrategy(times) {
    console.warn(`[Redis] Mencoba menyambung ulang... (Percobaan ke-${times})`);
    // Maksimal jeda adalah 2000 ms (2 detik) antar percobaan
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  // Mencegah aplikasi stuck jika Redis mati secara permanen
  maxRetriesPerRequest: null,
});

redisClient.on('connect', () => {
  console.log('[Redis] Berhasil terhubung ke server Redis');
});

redisClient.on('error', (err) => {
  console.error('[Redis] Terjadi kesalahan koneksi:', err.message);
});

module.exports = redisClient;