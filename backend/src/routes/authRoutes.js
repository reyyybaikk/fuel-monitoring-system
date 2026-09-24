const express = require('express');
const router = express.Router();
const { register, login, getMe, firebaseSync, requestOtp, verifyOtp, resolveWhatsapp } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Endpoint Publik
const { loginSchema, registerSchema } = require('../validators/authValidator');

// Generic validator middleware
const validate = schema => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    const err = new Error(error.details[0].message);
    err.statusCode = 400;
    return next(err);
  }
  next();
};

router.post('/register', validate(registerSchema), register);
router.post('/login', login);

router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/resolve-whatsapp', resolveWhatsapp);

// Endpoint Khusus Sinkronisasi dari Mobile Firebase Auth
router.post('/firebase-sync', authenticate, firebaseSync);

// Endpoint Terproteksi (Membutuhkan Token JWT yang sah / Firebase Token)
router.get('/me', authenticate, getMe);

// Endpoint Terproteksi khusus ADMIN (Menguji Authorization Role)
router.get('/admin-test', authenticate, authorize('ADMIN'), (req, res) => {
  res.status(200).json({
    success: true,
    message: `Halo Admin ${req.user.email}, Anda berhasil mengakses area khusus administrator.`
  });
});

module.exports = router;
