const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Endpoint Publik
router.post('/register', register);
router.post('/login', login);

// Endpoint Terproteksi (Membutuhkan Token JWT yang sah)
router.get('/me', authenticate, getMe);

// Endpoint Terproteksi khusus ADMIN (Menguji Authorization Role)
router.get('/admin-test', authenticate, authorize('ADMIN'), (req, res) => {
  res.status(200).json({
    success: true,
    message: `Halo Admin ${req.user.email}, Anda berhasil mengakses area khusus administrator.`
  });
});

module.exports = router;