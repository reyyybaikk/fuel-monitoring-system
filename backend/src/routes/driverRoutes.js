const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Semua endpoint Driver wajib terautentikasi dan dikhususkan untuk ADMIN & MANAGER
router.use(authenticate);
router.use(authorize('ADMIN', 'MANAGER'));

router.get('/', driverController.getAll);
router.get('/:id', driverController.getById);

module.exports = router;