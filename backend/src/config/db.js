const { Pool } = require('pg');
require('dotenv').config();

// Membuat pool koneksi menggunakan variabel dari .env
const { URL } = require('url');
const dbUrl = new URL(process.env.DATABASE_URL);
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