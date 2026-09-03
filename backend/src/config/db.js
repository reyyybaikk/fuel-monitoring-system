const { Pool } = require('pg');
require('dotenv').config();

// Membuat pool koneksi menggunakan variabel dari .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

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