const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Pastikan folder penyimpanan upload lokal tersedia
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi Penyimpanan Disk (Menyimpan di folder privat/backend, bukan public direktori web langsung)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Buat nama file unik untuk menghindari bentrok nama (timestamp + random string + ekstensi asli)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// Validasi Keamanan: Hanya mengizinkan jenis file gambar (MIME type & Ekstensi)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png'];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true); // Terima file
  } else {
    const error = new Error('Format file ditolak! Hanya file gambar berformat .jpg, .jpeg, atau .png yang diizinkan.');
    error.statusCode = 400;
    cb(error, false); // Tolak file
  }
};

// Batasan ukuran file (maksimal 5 MB per file untuk foto bukti)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  }
});

// Middleware untuk menerima dua file sekaligus: foto odometer dan foto nota/struk SPBU
const uploadTransactionPhotos = upload.fields([
  { name: 'odometer_photo', maxCount: 1 },
  { name: 'receipt_photo', maxCount: 1 }
]);

module.exports = uploadTransactionPhotos;