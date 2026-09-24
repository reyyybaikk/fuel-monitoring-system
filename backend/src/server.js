require('dotenv').config();
const app = require('./app');

// Ensure critical environment variables are set
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not defined. Exiting.');
  process.exit(1);
}
const db = require('./config/db'); 

const PORT = process.env.PORT || 3000;

// Fungsi untuk menguji koneksi database sebelum server menyala
async function startServer() {
  try {
    // Mencoba melakukan query sederhana ke database
    const result = await db.query('SELECT NOW()');
    console.log('Database connection verified at:', result.rows[0].now);

    // [AKTIF] '0.0.0.0' memastikan server bisa diakses oleh HP / perangkat luar di jaringan lokal yang sama
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server Fuel Monitoring aktif dan berjalan di port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to the database. Server will not start.');
    console.error('Error details:', error.message);
    process.exit(1); // Mematikan proses jika database gagal diakses
  }
}

startServer();
