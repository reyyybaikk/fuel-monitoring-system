const { Pool } = require('pg');
require('dotenv').config();

// Membuat pool koneksi menggunakan variabel dari .env
let connectionString = process.env.DATABASE_URL || '';
if (!connectionString.includes('sslmode=')) {
  const delimiter = connectionString.includes('?') ? '&' : '?';
  connectionString = `${connectionString}${delimiter}sslmode=require`;
}
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Tambahkan opsi tls: { rejectUnauthorized: false }
// Redis client is now handled in src/config/redis.js

// Mengecek apakah koneksi berhasil saat file ini dipanggil
pool.on('connect', () => {
  console.log('Connected to the PostgreSQL database successfully.');
});

// Menangkap error tak terduga pada pool database
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};