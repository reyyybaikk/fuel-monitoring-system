const express = require('express');
const router = express.Router();
const fuelTransactionController = require('../controllers/fuelTransactionController');
const uploadTransactionPhotos = require('../middleware/uploadMiddleware');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Semua wajib terautentikasi
router.use(authenticate);

// DRIVER: Membuat transaksi (Menerima input Multipart/form-data untuk file gambar)
router.post('/', authorize('DRIVER'), uploadTransactionPhotos, fuelTransactionController.create);

// SEMUA ROLE: Melihat daftar dan detail transaksi (berlaku IDOR protection di Service)
router.get('/', fuelTransactionController.getAll);
router.get('/:id', fuelTransactionController.getById);

// ADMIN/MANAGER: Memverifikasi / mengubah status transaksi
router.patch('/:id/status', authorize('ADMIN', 'MANAGER'), fuelTransactionController.updateStatus);

module.exports = router;