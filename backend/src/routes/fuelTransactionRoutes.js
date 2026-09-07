const express = require('express');
const router = express.Router();
const fuelTransactionController = require('../controllers/fuelTransactionController');
const uploadTransactionPhotos = require('../middleware/uploadMiddleware');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { uploadFile } = require('../services/uploadService');

// Semua endpoint wajib terautentikasi JWT
router.use(authenticate);

// DRIVER: Membuat transaksi (Menerima multipart/form-data)
router.post(
  '/',
  authorize('DRIVER'),
  uploadTransactionPhotos, // Middleware multer untuk menangkap 3 file
  fuelTransactionController.create
);

// SEMUA ROLE: Melihat riwayat transaksi (PASTIKAN DI ATAS /:id)
router.get('/history', fuelTransactionController.getAll);

// SEMUA ROLE: Melihat detail transaksi
router.get('/:id', fuelTransactionController.getById);

// STREAM FOTO DARI DATABASE: Mendapatkan binary foto
router.get('/:id/photo/:type', fuelTransactionController.getPhoto);

// ADMIN/MANAGER: Memverifikasi / mengubah status transaksi
router.patch('/:id/status', authorize('ADMIN', 'MANAGER'), fuelTransactionController.updateStatus);

module.exports = router;