const { Pool } = require('pg');
require('dotenv').config();

// Membuat pool koneksi menggunakan variabel dari .env
// Render menyediakan DATABASE_URL. Untuk pengembangan lokal, gunakan .env atau fallback.
const { URL } = require('url');
let dbUrl;
if (process.env.DATABASE_URL) {
  try {
    dbUrl = new URL(process.env.DATABASE_URL);
  } catch (e) {
    console.error('❌ DATABASE_URL tidak valid:', e.message);
    process.exit(1);
  }
} else {
  console.warn('⚠️ DATABASE_URL tidak ditemukan – menggunakan fallback PostgreSQL lokal.');
  dbUrl = new URL('postgres://postgres:postgres@localhost:5432/fuel_monitoring');
}
const pool = new Pool({
  host: dbUrl.hostname,
  port: dbUrl.port,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.replace(/^\//, ''),
  ssl: { rejectUnauthorized: false },
});// Redis client is now handled in src/config/redis.js

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