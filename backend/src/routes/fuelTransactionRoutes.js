const express = require('express');
const router = express.Router();
const fuelTransactionController = require('../controllers/fuelTransactionController');
const uploadTransactionPhotos = require('../middleware/uploadMiddleware');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Semua endpoint wajib terautentikasi JWT
router.use(authenticate);

// 1. ANALYTICS & SUMMARY (Khusus ADMIN/MANAGER - Ported from legacy)
router.get('/analytics', authorize('ADMIN_PUSAT', 'ADMIN', 'MANAGER'), fuelTransactionController.getAnalytics);
router.get('/summary', authorize('ADMIN_PUSAT', 'ADMIN', 'MANAGER'), fuelTransactionController.getSummary);
router.get('/export-pdf', authorize('ADMIN_PUSAT', 'ADMIN', 'MANAGER'), fuelTransactionController.exportPdf);
router.get('/export-pdf-preview', authorize('ADMIN_PUSAT', 'ADMIN', 'MANAGER'), fuelTransactionController.exportPdfPreview);

// 2. DRIVER: Membuat transaksi (Menerima multipart/form-data)
router.post(
  '/',
  authorize('DRIVER'),
  uploadTransactionPhotos,
  fuelTransactionController.create
);

// 3. RIWAYAT TRANSAKSI
router.get('/history', fuelTransactionController.getAll);

// 4. DETAIL TRANSAKSI
router.get('/:id', fuelTransactionController.getById);

// 5. STREAM FOTO
router.get('/:id/photo/:type', fuelTransactionController.getPhoto);

// 6. ADMIN/MANAGER: Verifikasi Status
router.patch('/:id/status', authorize('ADMIN_PUSAT', 'ADMIN', 'MANAGER'), fuelTransactionController.updateStatus);

module.exports = router;
