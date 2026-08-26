require('dotenv').config();
const app = require('./app');
const db = require('./config/db');

const PORT = process.env.PORT || 3000;

// Fungsi untuk menguji koneksi database sebelum server menyala
async function startServer() {
  try {
    // Mencoba melakukan query sederhana ke database
    const result = await db.query('SELECT NOW()');
    console.log('Database connection verified at:', result.rows[0].now);

    // Jika berhasil, nyalakan server Express
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to the database. Server will not start.');
    console.error('Error details:', error.message);
    process.exit(1); // Mematikan proses jika database gagal diakses
  }
}

startServer();