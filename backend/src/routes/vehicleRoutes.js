const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Semua endpoint Vehicle wajib terautentikasi
router.use(authenticate);

// GET list & detail: Bisa diakses oleh ADMIN, MANAGER, DRIVER
router.get('/', vehicleController.getAll);
router.get('/:id', vehicleController.getById);

// POST, PATCH, DELETE: Hanya bisa diakses oleh ADMIN dan MANAGER
router.post('/', authorize('ADMIN', 'MANAGER'), vehicleController.create);
router.patch('/:id', authorize('ADMIN', 'MANAGER'), vehicleController.update);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), vehicleController.remove);

module.exports = router;