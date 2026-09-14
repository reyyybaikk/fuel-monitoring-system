require('dotenv').config();
const app = require('./app');
const db = require('./config/db'); 
const fuelRoutes = require('./routes/fuelRoutes'); // Mengimpor rute API verifikasi No. Polisi & Transaksi BBM

const PORT = process.env.PORT || 3000;

// Daftarkan rute API utama ke dalam aplikasi Express
app.use('/api', fuelRoutes);

// Fungsi untuk menguji koneksi database sebelum server menyala
async function startServer() {
  try {
    // Mencoba melakukan query sederhana ke database untuk wilayah operasional 
    // (Banjarmasin, Barabai, Kapuas, Palangkaraya, Pangkalanbun)[cite: 1]
    const result = await db.query('SELECT NOW()');
    console.log('Database connection verified at:', result.rows[0].now);

    // [AKTIF] '0.0.0.0' memastikan server bisa diakses oleh HP (Xiaomi) / perangkat luar di jaringan lokal yang sama
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