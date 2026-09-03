const multer = require('multer');
const path = require('path');

// Menggunakan memoryStorage (file disimpan sementara sebagai Buffer di RAM)
// Tidak membuat file fisik di direktori server
const storage = multer.memoryStorage();

// Validasi Keamanan: Hanya mengizinkan jenis file gambar (MIME type & Ekstensi)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true); // Terima file
  } else {
    const error = new Error('Format file ditolak! Hanya file gambar berformat .jpg, .jpeg, .png, atau .webp yang diizinkan.');
    error.statusCode = 400;
    cb(error, false); // Tolak file
  }
};

// Batasan ukuran file (maksimal 5 MB per file foto sebelum disimpan ke BYTEA DB)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  }
});

// Middleware untuk menerima tiga file sekaligus:
// foto odometer sebelum isi, foto nota/struk SPBU, dan foto odometer sesudah isi
const uploadTransactionPhotos = upload.fields([
  { name: 'odometer_photo', maxCount: 1 },
  { name: 'receipt_photo', maxCount: 1 },
  { name: 'odometer_after_photo', maxCount: 1 }
]);

module.exports = uploadTransactionPhotos;