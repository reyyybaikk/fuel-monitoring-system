const express = require('express');
const router = express.Router();
const fuelTransactionController = require('../controllers/fuelTransactionController');
const uploadTransactionPhotos = require('../middleware/uploadMiddleware');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// STREAM FOTO (Publik/Redirect ke Supabase Storage)
router.get('/:id/photo/:type', fuelTransactionController.getPhoto);

// Semua endpoint operasional lainnya wajib terautentikasi JWT
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



// 6. ADMIN/MANAGER: Verifikasi Status
router.patch('/:id/status', authorize('ADMIN_PUSAT', 'ADMIN', 'MANAGER'), fuelTransactionController.updateStatus);

// 7. ADMIN/MANAGER: Koreksi Data
router.put('/:id', authorize('ADMIN_PUSAT', 'ADMIN', 'MANAGER'), fuelTransactionController.update);

// 8. ADMIN/MANAGER: ML Feedback Loop
router.post('/:id/feedback', authorize('ADMIN_PUSAT', 'ADMIN', 'MANAGER'), fuelTransactionController.submitFeedback);

module.exports = router;
