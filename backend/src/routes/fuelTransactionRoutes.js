const express = require('express');
const router = express.Router();
const fuelTransactionController = require('../controllers/fuelTransactionController');
const uploadTransactionPhotos = require('../middleware/uploadMiddleware');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const { uploadFile } = require('../services/uploadService');
// ... di dalam handler POST /fuel-transactions
const file = req.file;            // pakai multer atau busboy
const publicUrl = await uploadFile(file.buffer, `fuel/${file.originalname}`);

// Semua endpoint wajib terautentikasi JWT
router.use(authenticate);

// DRIVER: Membuat transaksi (Menerima multipart/form-data dan menyimpan foto ke PostgreSQL BYTEA)
router.post('/', authorize('DRIVER'), uploadTransactionPhotos, fuelTransactionController.create);

// SEMUA ROLE: Melihat daftar transaksi & detail transaksi
router.get('/', fuelTransactionController.getAll);
router.get('/:id', fuelTransactionController.getById);

// STREAM FOTO DARI DATABASE: Mendapatkan binary foto (odometer, receipt, odometer-after)
router.get('/:id/photo/:type', fuelTransactionController.getPhoto);

// ADMIN/MANAGER: Memverifikasi / mengubah status transaksi
router.patch('/:id/status', authorize('ADMIN', 'MANAGER'), fuelTransactionController.updateStatus);

module.exports = router;