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
  uploadTransactionPhotos, // Middleware multer untuk menangkap file
  async (req, res, next) => {
    try {
      // Upload file to Supabase if present
      if (req.file) {
        const publicUrl = await uploadFile(req.file.buffer, `fuel/${Date.now()}_${req.file.originalname}`);
        // Attach URL to request body so controller can store it
        req.body.photoUrl = publicUrl;
      }
      await fuelTransactionController.create(req, res);
    } catch (err) {
      next(err);
    }
  }
);

// SEMUA ROLE: Melihat daftar transaksi & detail transaksi
router.get('/', fuelTransactionController.getAll);
router.get('/:id', fuelTransactionController.getById);

// STREAM FOTO DARI DATABASE: Mendapatkan binary foto
router.get('/:id/photo/:type', fuelTransactionController.getPhoto);

// ADMIN/MANAGER: Memverifikasi / mengubah status transaksi
router.patch('/:id/status', authorize('ADMIN', 'MANAGER'), fuelTransactionController.updateStatus);

module.exports = router;